"""BRVM ingestion worker.

Step 1 ships the skeleton only. Step 2 adds:
- PDF text extraction with OCR fallback (tesseract fra+eng)
- table-aware chunking
- embeddings into pgvector
"""

__version__ = "0.1.0"
