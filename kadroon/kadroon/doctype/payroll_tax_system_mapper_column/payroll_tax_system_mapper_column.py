# Copyright (c) 2025, Innomate LLC and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document

class PayrollTaxSystemMapperColumn(Document):
    def validate(self):
        # Ensure source_field is set
        if not self.source_field:
            frappe.throw(_("Source Field is required"))
        
        # Validate formula syntax if provided
        if self.formula:
            self.validate_formula()
    
    def validate_formula(self):
        """
        Validates the formula syntax
        """
        try:
            # Create a simple namespace with math functions for validation
            import math
            namespace = {
                "value": 0,
                "abs": math.abs,
                "ceil": math.ceil,
                "floor": math.floor,
                "round": round,
                "max": max,
                "min": min,
                "sum": sum,
                "avg": lambda x: sum(x) / len(x) if x else 0
            }
            
            # Add dummy values for all possible fields
            field_values = {
                "gross_pay": 0,
                "net_pay": 0,
                "total_deduction": 0,
                "basic_salary": 0,
                "tax_id": "",
                "base": 0,
                "variable": 0
            }
            
            # Add dummy values for salary components
            components = frappe.get_all("Salary Component", fields=["name"])
            for component in components:
                field_values[f"{component.name}"] = 0
                field_values[f"{component.name}"] = 0
            
            # Combine namespaces
            namespace.update(field_values)
            
            # Try to evaluate the formula
            eval(self.formula, {"__builtins__": {}}, namespace)
        except Exception as e:
            frappe.throw(_("Formula validation error: {0}").format(str(e)))
    
@frappe.whitelist()
def get_doctype_fields(doctype_name):
    """
    Returns a list of fields for the given DocType
    """
    try:
        # Get the DocType metadata
        meta = frappe.get_meta(doctype_name)
        
        # Get all fields that contain data (exclude sections, columns, etc.)
        data_fields = []
        for field in meta.fields:
            if field.fieldtype not in [
                'Section Break', 'Column Break', 'Tab Break', 'HTML', 
                'Button', 'Fold', 'Heading', 'Image'
            ]:
                data_fields.append(field.fieldname)
        
        return data_fields
    except Exception as e:
        frappe.log_error(f"Error getting fields for {doctype_name}: {str(e)}")
        return []

@frappe.whitelist()
def get_salary_components():
    """
    Returns a list of all Salary Components
    """
    try:
        components = frappe.get_all("Salary Component", fields=["name","salary_component_abbr", "type"])
        return [{c.name:[c.salary_component_abbr,c.type]} for c in components]
    except Exception as e:
        frappe.log_error(f"Error getting salary components: {str(e)}")
        return []

@frappe.whitelist()
def get_child_table_fields(doctype_name, child_table_field):
    """
    Returns a list of fields for a child table
    """
    try:
        # Get the child table DocType name
        meta = frappe.get_meta(doctype_name)
        child_doctype = None
        
        for field in meta.fields:
            if field.fieldname == child_table_field and field.fieldtype == 'Table':
                child_doctype = field.options
                break
        
        if not child_doctype:
            return []
        
        # Get the fields from the child DocType
        child_meta = frappe.get_meta(child_doctype)
        data_fields = []
        
        for field in child_meta.fields:
            if field.fieldtype not in [
                'Section Break', 'Column Break', 'Tab Break', 'HTML', 
                'Button', 'Table', 'Fold', 'Heading', 'Image'
            ]:
                data_fields.append(field.fieldname)
        
        return data_fields
    except Exception as e:
        frappe.log_error(f"Error getting child table fields: {str(e)}")
        return []