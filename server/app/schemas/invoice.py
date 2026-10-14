from pydantic import BaseModel
from typing import Optional

# Real: OpenAI Structured Outputs (json_schema) — LLM never calculates amounts
# Every field must include exact source_string mapped to Textract BoundingBox

class InvoiceField(BaseModel):
    value: Optional[str] = None
    source_string: Optional[str] = None

class ExtractedInvoice(BaseModel):
    vendor_name: InvoiceField
    invoice_number: InvoiceField
    date: InvoiceField  # ISO 8601 if unambiguous, else None
    total_amount: InvoiceField  # decimal string, as written
    bounding_boxes: dict = {}  # JSONB: {"vendor_name": {"page":1,"left":...}}
