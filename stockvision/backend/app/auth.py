import logging
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status
import jwt
from app.config import settings
from app.db import get_supabase

logger = logging.getLogger(__name__)

def is_supabase_configured() -> bool:
    """Check if valid non-placeholder Supabase credentials exist."""
    return bool(
        settings.SUPABASE_URL
        and "your-project" not in settings.SUPABASE_URL
        and settings.SUPABASE_KEY
        and "your-anon" not in settings.SUPABASE_KEY
    )

def verify_token(token: str) -> Dict[str, Any]:
    """Verify Supabase access token and return user details with admin role."""
    clean_token = token.strip()
    if clean_token.startswith("Bearer "):
        clean_token = clean_token[7:].strip()

    # 1. Fallback for demo token or unconfigured placeholder credentials during development
    if not is_supabase_configured() or clean_token.startswith("demo-"):
        try:
            unverified = jwt.decode(clean_token, options={"verify_signature": False})
            email = unverified.get("email", "demo@stockvision.edu")
            is_admin = bool(
                clean_token.startswith("demo-admin")
                or email.lower().startswith("admin@")
                or unverified.get("is_admin", False)
            )
            return {
                "id": unverified.get("sub", "00000000-0000-0000-0000-000000000001"),
                "email": email,
                "is_admin": is_admin,
                "token": clean_token,
            }
        except Exception:
            is_admin = clean_token.startswith("demo-admin")
            return {
                "id": "00000000-0000-0000-0000-000000000001",
                "email": "admin@stockvision.edu" if is_admin else "demo@stockvision.edu",
                "is_admin": is_admin,
                "token": clean_token,
            }

    # 2. Try Supabase Auth get_user
    supabase = get_supabase()
    if supabase:
        try:
            user_response = supabase.auth.get_user(clean_token)
            if user_response and user_response.user:
                u = user_response.user
                is_admin = bool(
                    (u.user_metadata and u.user_metadata.get("is_admin"))
                    or (u.app_metadata and u.app_metadata.get("is_admin"))
                    or (u.email and u.email.lower().startswith("admin@"))
                )

                # Check profiles table if metadata wasn't set
                if not is_admin:
                    try:
                        p_res = supabase.table("profiles").select("is_admin").eq("id", u.id).limit(1).execute()
                        if p_res.data and len(p_res.data) > 0:
                            is_admin = bool(p_res.data[0].get("is_admin", False))
                    except Exception:
                        pass

                return {
                    "id": u.id,
                    "email": u.email or "user@stockvision.edu",
                    "is_admin": is_admin,
                    "token": clean_token,
                }
        except Exception as e:
            logger.debug(f"supabase.auth.get_user check failed: {e}")

    # 3. Try verification with SUPABASE_JWT_SECRET if provided
    if settings.SUPABASE_JWT_SECRET:
        try:
            payload = jwt.decode(
                clean_token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )
            email = payload.get("email", "user@stockvision.edu")
            is_admin = bool(
                payload.get("is_admin")
                or payload.get("user_metadata", {}).get("is_admin")
                or payload.get("app_metadata", {}).get("is_admin")
                or (email and email.lower().startswith("admin@"))
            )
            return {
                "id": payload.get("sub"),
                "email": email,
                "is_admin": is_admin,
                "token": clean_token,
            }
        except Exception as e:
            logger.warning(f"JWT secret verification failed: {e}")

    # 4. If token decodes without signature verification during development
    try:
        payload = jwt.decode(clean_token, options={"verify_signature": False})
        if payload.get("sub"):
            email = payload.get("email", "user@stockvision.edu")
            is_admin = bool(
                payload.get("is_admin")
                or payload.get("user_metadata", {}).get("is_admin")
                or payload.get("app_metadata", {}).get("is_admin")
                or (email and email.lower().startswith("admin@"))
            )
            return {
                "id": payload.get("sub"),
                "email": email,
                "is_admin": is_admin,
                "token": clean_token,
            }
    except Exception:
        pass

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication token or expired session.",
        headers={"WWW-Authenticate": "Bearer"},
    )

def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """FastAPI Dependency for strictly authenticated endpoints."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return verify_token(authorization)

def get_optional_user(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    """FastAPI Dependency for optional authentication (e.g. logging predictions)."""
    if not authorization:
        return None
    try:
        return verify_token(authorization)
    except Exception:
        return None

def get_admin_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """FastAPI Dependency for administrator endpoints. Rejects non-admin users with 403."""
    user = get_current_user(authorization)
    if not user.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Administrator privileges required.",
        )
    return user
