# Copyright (c) 2025, Innomate LLC and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document

class PayrollTaxSystemMapper(Document):
    def validate(self):
        # Check if another mapper exists for the same company
        existing_mappers = frappe.get_all(
            "Payroll Tax System Mapper",
            filters={
                "company": self.company,
                "name": ["!=", self.name]
            }
        )
        
        if existing_mappers:
            frappe.throw(_("Another Payroll Tax System Mapper already exists for company {0}").format(self.company))
        
        # Ensure at least one column is defined
        if not self.report_columns or len(self.report_columns) == 0:
            frappe.throw(_("At least one column mapping must be defined"))
