"""
accounts/storage.py

Centralised Supabase Storage layer.

Buckets (create all in Supabase Dashboard → Storage, set each to Public):
  profile-pictures   — user avatars
  announcements      — announcement attachments (images + PDFs)
  assignments        — teacher assignment files
  submissions        — student submission files
  learning-materials — DLP/DLL/module files
  reports            — grade reports, generated PDFs
  enrollment-docs    — enrollment application documents
  branding           — school logo and website content images

Each bucket has its own size limit and allowed MIME types.
The service-role key bypasses RLS — all uploads are server-side only.
"""

import os
import secrets
import logging
import mimetypes
from dataclasses import dataclass, field
from typing import Optional

from django.conf import settings

logger = logging.getLogger(__name__)


# ─── Bucket configuration ─────────────────────────────────────────────────────

@dataclass
class BucketConfig:
    name: str                          # Supabase bucket name
    max_bytes: int                     # Hard size limit
    allowed_mime: tuple                # Allowed MIME types
    allowed_ext: tuple                 # Allowed file extensions (lowercase, with dot)
    env_var: str                       # Settings attribute name


BUCKETS: dict[str, BucketConfig] = {
    'profile-pictures': BucketConfig(
        name='profile-pictures',
        max_bytes=5 * 1024 * 1024,     # 5 MB
        allowed_mime=('image/jpeg', 'image/png', 'image/webp', 'image/gif'),
        allowed_ext=('.jpg', '.jpeg', '.png', '.webp', '.gif'),
        env_var='SUPABASE_BUCKET_PROFILES',
    ),
    'announcements': BucketConfig(
        name='announcements',
        max_bytes=20 * 1024 * 1024,    # 20 MB
        allowed_mime=(
            'image/jpeg', 'image/png', 'image/webp', 'image/gif',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ),
        allowed_ext=('.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf', '.doc', '.docx', '.ppt', '.pptx'),
        env_var='SUPABASE_BUCKET_ANNOUNCEMENTS',
    ),
    'assignments': BucketConfig(
        name='assignments',
        max_bytes=50 * 1024 * 1024,    # 50 MB
        allowed_mime=(
            'image/jpeg', 'image/png', 'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
        ),
        allowed_ext=('.jpg', '.jpeg', '.png', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt'),
        env_var='SUPABASE_BUCKET_ASSIGNMENTS',
    ),
    'submissions': BucketConfig(
        name='submissions',
        max_bytes=50 * 1024 * 1024,    # 50 MB
        allowed_mime=(
            'image/jpeg', 'image/png', 'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
        ),
        allowed_ext=('.jpg', '.jpeg', '.png', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt'),
        env_var='SUPABASE_BUCKET_SUBMISSIONS',
    ),
    'learning-materials': BucketConfig(
        name='learning-materials',
        max_bytes=100 * 1024 * 1024,   # 100 MB (DLPs can be large)
        allowed_mime=(
            'image/jpeg', 'image/png', 'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
            'video/mp4', 'video/webm',
        ),
        allowed_ext=('.jpg', '.jpeg', '.png', '.webp', '.pdf', '.doc', '.docx',
                     '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.mp4', '.webm'),
        env_var='SUPABASE_BUCKET_MATERIALS',
    ),
    'reports': BucketConfig(
        name='reports',
        max_bytes=20 * 1024 * 1024,    # 20 MB
        allowed_mime=('application/pdf', 'image/jpeg', 'image/png'),
        allowed_ext=('.pdf', '.jpg', '.jpeg', '.png'),
        env_var='SUPABASE_BUCKET_REPORTS',
    ),
    'enrollment-docs': BucketConfig(
        name='enrollment-docs',
        max_bytes=10 * 1024 * 1024,    # 10 MB per document
        allowed_mime=(
            'application/pdf',
            'image/jpeg', 'image/png', 'image/webp', 'image/gif',
            # Word documents (students commonly submit requirements as .docx)
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            # Excel (for some school forms)
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            # Generic binary fallback for browsers that misreport MIME
            'application/octet-stream',
            'binary/octet-stream',
        ),
        allowed_ext=(
            '.pdf', '.jpg', '.jpeg', '.png', '.webp', '.gif',
            '.doc', '.docx', '.xls', '.xlsx',
        ),
        env_var='SUPABASE_BUCKET_ENROLLMENT',
    ),
    'branding': BucketConfig(
        name='branding',
        max_bytes=5 * 1024 * 1024,     # 5 MB
        allowed_mime=('image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'),
        allowed_ext=('.jpg', '.jpeg', '.png', '.webp', '.svg'),
        env_var='SUPABASE_BUCKET_BRANDING',
    ),
    'chat-attachments': BucketConfig(
        name='chat-attachments',
        max_bytes=25 * 1024 * 1024,    # 25 MB
        allowed_mime=(
            'image/jpeg', 'image/png', 'image/webp', 'image/gif',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
        ),
        allowed_ext=(
            '.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf',
            '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt',
        ),
        env_var='SUPABASE_BUCKET_CHAT',
    ),
    'chat-avatars': BucketConfig(
        name='chat-avatars',
        max_bytes=5 * 1024 * 1024,     # 5 MB
        allowed_mime=('image/jpeg', 'image/png', 'image/webp', 'image/gif'),
        allowed_ext=('.jpg', '.jpeg', '.png', '.webp', '.gif'),
        env_var='SUPABASE_BUCKET_CHAT_AVATARS',
    ),
    'compliance-documents': BucketConfig(
        name='compliance-documents',
        max_bytes=50 * 1024 * 1024,    # 50 MB
        allowed_mime=(
            'image/jpeg', 'image/png', 'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ),
        allowed_ext=('.jpg', '.jpeg', '.png', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx'),
        env_var='SUPABASE_BUCKET_COMPLIANCE',
    ),
}


def _get_bucket_name(bucket_key: str) -> str:
    """
    Resolve the actual bucket name from settings (env override) or default.
    Allows renaming buckets per environment without code changes.
    """
    cfg = BUCKETS.get(bucket_key)
    if not cfg:
        raise ValueError(f"Unknown bucket key: '{bucket_key}'. Valid keys: {list(BUCKETS)}")
    return getattr(settings, cfg.env_var, None) or cfg.name


_supabase_client = None
_supabase_url = None

def _get_supabase_client():
    """Return a cached authenticated Supabase client or raise if not configured."""
    global _supabase_client, _supabase_url
    if _supabase_client is not None:
        return _supabase_client, _supabase_url
    from supabase import create_client
    url = (getattr(settings, 'SUPABASE_URL', '') or '').strip()
    key = (getattr(settings, 'SUPABASE_KEY', '') or '').strip()
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set in environment variables.")
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url
    _supabase_client = create_client(url, key)
    _supabase_url = url
    return _supabase_client, url


# ─── Validation ───────────────────────────────────────────────────────────────

class StorageValidationError(Exception):
    """Raised when a file fails validation before upload."""
    pass


def validate_file(file, bucket_key: str) -> None:
    """
    Validate file size, extension, and MIME type against the bucket's policy.
    Raises StorageValidationError with a user-friendly message on failure.
    """
    cfg = BUCKETS.get(bucket_key)
    if not cfg:
        raise StorageValidationError(f"Unknown storage bucket: {bucket_key}")

    # ── Size check ────────────────────────────────────────────────────────────
    file.seek(0, 2)          # seek to end
    size = file.tell()
    file.seek(0)             # reset
    max_mb = cfg.max_bytes // (1024 * 1024)
    if size > cfg.max_bytes:
        actual_mb = round(size / (1024 * 1024), 1)
        raise StorageValidationError(
            f"File too large ({actual_mb} MB). Maximum allowed for this upload is {max_mb} MB."
        )

    # ── Extension check ───────────────────────────────────────────────────────
    name = getattr(file, 'name', '') or ''
    ext = os.path.splitext(name)[1].lower()
    if ext not in cfg.allowed_ext:
        raise StorageValidationError(
            f"File type '{ext}' is not allowed here. "
            f"Accepted: {', '.join(cfg.allowed_ext)}"
        )

    # ── MIME type check (browser-reported) ───────────────────────────────────
    content_type = getattr(file, 'content_type', '') or ''
    if content_type:
        # Normalise: strip parameters like '; charset=utf-8'
        mime = content_type.split(';')[0].strip().lower()
        if mime and mime not in cfg.allowed_mime:
            raise StorageValidationError(
                f"File content type '{mime}' is not allowed here."
            )

    # ── Basic magic-byte check for images ────────────────────────────────────
    # Read first 12 bytes to verify the file is actually what it claims to be.
    # This is a lightweight guard — not a full antivirus scan.
    header = file.read(12)
    file.seek(0)
    _check_magic_bytes(header, ext, content_type)


_MAGIC_SIGNATURES = {
    '.jpg':  [(0, b'\xff\xd8\xff')],
    '.jpeg': [(0, b'\xff\xd8\xff')],
    '.png':  [(0, b'\x89PNG\r\n\x1a\n')],
    '.gif':  [(0, b'GIF87a'), (0, b'GIF89a')],
    '.webp': [(0, b'RIFF'), (8, b'WEBP')],
    '.pdf':  [(0, b'%PDF')],
}


def _check_magic_bytes(header: bytes, ext: str, content_type: str) -> None:
    """Verify file header matches the declared extension for common types."""
    sigs = _MAGIC_SIGNATURES.get(ext)
    if not sigs:
        return  # No magic check for office docs, videos, etc.

    for offset, magic in sigs:
        chunk = header[offset:offset + len(magic)]
        if chunk == magic:
            return  # Matched

    raise StorageValidationError(
        f"File content does not match its extension '{ext}'. "
        "The file may be corrupted or renamed to bypass type checks."
    )


# ─── Upload ───────────────────────────────────────────────────────────────────

def upload_file(file, bucket_key: str, folder: str = '') -> tuple[Optional[str], Optional[str]]:
    """
    Validate and upload a file to the specified Supabase bucket.

    Args:
        file:       Django UploadedFile object
        bucket_key: One of the keys in BUCKETS (e.g. 'profile-pictures')
        folder:     Optional subfolder within the bucket (e.g. 'user_42')

    Returns:
        (public_url, None)        on success
        (None, error_message)     on failure
    """
    try:
        validate_file(file, bucket_key)
    except StorageValidationError as e:
        return None, str(e)

    try:
        client, base_url = _get_supabase_client()
        bucket_name = _get_bucket_name(bucket_key)

        ext = os.path.splitext(getattr(file, 'name', '') or '')[1].lower() or '.bin'
        token = secrets.token_hex(12)
        path = f"{folder}/{token}{ext}" if folder else f"{token}{ext}"

        file.seek(0)
        content = file.read()
        content_type = getattr(file, 'content_type', None) or 'application/octet-stream'

        storage = client.storage.from_(bucket_name)
        res = storage.upload(
            path=path,
            file=content,
            file_options={'content-type': content_type, 'upsert': 'false'},
        )

        # Handle both dict-style and object-style responses across supabase-py versions
        if isinstance(res, dict) and res.get('error'):
            return None, f"Storage error: {res.get('message', res['error'])}"
        if hasattr(res, 'error') and res.error:
            msg = res.error.get('message', str(res.error)) if isinstance(res.error, dict) else str(res.error)
            return None, f"Storage error: {msg}"

        public_url = f"{base_url.rstrip('/')}/storage/v1/object/public/{bucket_name}/{path}"
        if not public_url.startswith(('http://', 'https://')):
            public_url = 'https://' + public_url
        logger.info(f"Uploaded to {bucket_key}/{path} ({len(content)} bytes)")
        return public_url, None

    except RuntimeError as e:
        logger.error(f"Supabase not configured: {e}")
        return None, str(e)
    except Exception as e:
        logger.error(f"Upload failed [{bucket_key}]: {e}", exc_info=True)
        return None, "File upload failed. Please try again."


# ─── Delete ───────────────────────────────────────────────────────────────────

def download_file(public_url: str, bucket_key: str):
    """
    Download a file from Supabase Storage given its public URL.
    Returns (content_bytes, content_type) on success, (None, error_msg) on failure.
    """
    if not public_url:
        return None, 'No URL provided'
    try:
        client, base_url = _get_supabase_client()
        bucket_name = _get_bucket_name(bucket_key)

        marker = f'/object/public/{bucket_name}/'
        idx = public_url.find(marker)
        if idx == -1:
            return None, f'Cannot parse path from URL'
        path = public_url[idx + len(marker):]

        storage = client.storage.from_(bucket_name)
        res = storage.download(path)
        if isinstance(res, bytes):
            content_type = mimetypes.guess_type(public_url)[0] or 'application/octet-stream'
            return res, content_type
        if hasattr(res, 'data'):
            content_type = mimetypes.guess_type(public_url)[0] or 'application/octet-stream'
            return res.data, content_type
        return None, 'Unexpected response from storage'
    except Exception as e:
        logger.error(f"Download failed [{bucket_key}]: {e}", exc_info=True)
        return None, str(e)


# ─── Delete ───────────────────────────────────────────────────────────────────

def delete_file(public_url: str, bucket_key: str) -> bool:
    """
    Delete a file from Supabase Storage given its public URL.
    Returns True on success, False on failure (logs the error).
    """
    if not public_url:
        return False
    try:
        client, base_url = _get_supabase_client()
        bucket_name = _get_bucket_name(bucket_key)

        # Extract path from URL: .../object/public/{bucket}/{path}
        marker = f'/object/public/{bucket_name}/'
        idx = public_url.find(marker)
        if idx == -1:
            logger.warning(f"Cannot parse path from URL: {public_url}")
            return False
        path = public_url[idx + len(marker):]

        client.storage.from_(bucket_name).remove([path])
        logger.info(f"Deleted {bucket_key}/{path}")
        return True
    except Exception as e:
        logger.error(f"Delete failed [{bucket_key}]: {e}", exc_info=True)
        return False


# ─── Storage analytics ────────────────────────────────────────────────────────

def get_storage_stats() -> dict:
    """
    Return file counts and estimated sizes per bucket.
    Uses the Supabase Storage API to list objects in each bucket.
    Returns a dict suitable for the admin analytics endpoint.
    """
    try:
        client, _ = _get_supabase_client()
    except RuntimeError as e:
        return {'error': str(e), 'buckets': {}}

    stats = {}
    for key, cfg in BUCKETS.items():
        bucket_name = _get_bucket_name(key)
        try:
            objects = client.storage.from_(bucket_name).list()
            if isinstance(objects, list):
                count = len(objects)
                total_bytes = sum(
                    obj.get('metadata', {}).get('size', 0)
                    for obj in objects
                    if isinstance(obj, dict)
                )
            else:
                count = 0
                total_bytes = 0

            stats[key] = {
                'bucket': bucket_name,
                'file_count': count,
                'total_mb': round(total_bytes / (1024 * 1024), 2),
                'max_file_mb': cfg.max_bytes // (1024 * 1024),
                'allowed_types': list(cfg.allowed_ext),
            }
        except Exception as e:
            stats[key] = {'bucket': bucket_name, 'error': str(e)}

    return {'buckets': stats}
