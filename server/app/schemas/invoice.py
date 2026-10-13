from pydantic import BaseModel
from typing import Optional

class InvoiceField(BaseModel):
    value: Optional[str] = None
    source_string: Optional[str] = None  # exact substring for Textract bounding box mapping

class ExtractedInvoice(BaseModel):
    vendor_name: InvoiceField
    invoice_number: InvoiceField
    date: InvoiceField  # ISO 8601 if unambiguous, else null
    total_amount: InvoiceField  # decimal string, as written on invoice
