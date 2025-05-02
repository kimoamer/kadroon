# Copyright (c) 2025, Innomate LLC and contributors
# For license information, please see license.txt

import frappe
from frappe import _
import json
from frappe.utils import cstr, getdate, formatdate
import csv
import io
import os
# import xlsxwriter
from frappe.utils.file_manager import save_file

class MonthlyPayrollTaxSystemReport:
    def __init__(self, filters=None):
        self.filters = frappe._dict(filters or {})
        self.mapper = None
        self.data = []
        self.columns = []
        self.code_fields = []  # Store code_fields for second header row
        
    def run(self):
        self.load_mapper()
        self.prepare_columns()
        self.prepare_data()
        return self.columns, self.data
        
    def load_mapper(self):
        company = self.filters.get("company")
        if not company:
            frappe.throw(_("Please select a Company"))
            
        # Find mapper for selected company
        mappers = frappe.get_all(
            "Payroll Tax System Mapper", 
            filters={"company": company},
            fields=["name"],
            limit=1
        )
        
        if not mappers:
            frappe.throw(_("No Payroll Tax System Mapper found for company {0}").format(company))
            
        self.mapper = frappe.get_doc("Payroll Tax System Mapper", mappers[0].name)
    
    def prepare_columns(self):
        self.columns = []
        self.code_fields = []  # Reset code_fields
        
        for col in self.mapper.report_columns:
            # Add column regardless of auto_fill status
            field_name = col.column_name.lower().replace(" ", "_")
            if col.code_field:
                field_name = col.code_field.lower()
                
            self.columns.append({
                "label": col.column_name or col.code_field,
                "fieldname": field_name,
                "fieldtype": "Data",
                "width": 120
            })
            
            # Store the code_field for second header row in export
            self.code_fields.append(col.code_field or "")
    
    def prepare_data(self):
        """
        Completely reworked data preparation logic to fix row shifting issues.
        """
        self.data = []
        
        # First, identify all employees who should be in the report
        employee_list = self.get_employees_for_report()
        
        if not employee_list:
            frappe.msgprint(_("No employees found for the selected period."))
            return
        
        # For each employee, create a complete row with all columns
        for employee in employee_list:
            row = self.create_complete_row_for_employee(employee)
            if row:  # Only add the row if data was generated
                self.data.append(row)
    
    def get_employees_for_report(self):
        """
        Identify all employees who should appear in the report.
        Returns a list of employee IDs.
        """
        employees = set()
        
        # Get employees from salary slips in the reporting period
        if self.filters.get("from_date") and self.filters.get("to_date"):
            salary_slips = frappe.get_all(
                "Salary Slip",
                filters={
                    "company": self.filters.get("company"),
                    "docstatus": 1,  # Only submitted slips
                    "start_date": ["between", [self.filters.get("from_date"), self.filters.get("to_date")]]
                },
                fields=["employee"]
            )
            
            employees.update({slip.employee for slip in salary_slips})
        
        # If no employees found from salary slips, consider getting active employees
        if not employees and self.filters.get("company"):
            active_employees = frappe.get_all(
                "Employee",
                filters={
                    "company": self.filters.get("company"),
                    "status": "Active"
                },
                fields=["name"]
            )
            
            employees.update({emp.name for emp in active_employees})
        
        return list(employees)
    
    def create_complete_row_for_employee(self, employee_id):
        """
        Create a complete row for a single employee with all columns filled.
        This approach ensures all data for one employee stays together.
        """
        if not employee_id:
            return None
            
        # Get the employee document
        try:
            employee_doc = frappe.get_doc("Employee", employee_id)
        except Exception as e:
            frappe.log_error(f"Error fetching Employee {employee_id}: {str(e)}")
            return None
            
        # Get the most recent salary slip in the reporting period
        salary_slip_doc = self.get_salary_slip_for_employee(employee_id)
        
        # Initialize the row with all column fieldnames
        row = {}
        for col in self.columns:
            row[col["fieldname"]] = ""
            
        # Now fill in all the values based on the column configurations
        for col in self.mapper.report_columns:
            field_name = col.column_name.lower().replace(" ", "_")
            if col.code_field:
                field_name = col.code_field.lower()
                
            # Handle different column types
            if col.auto_fill and col.based_on_formula and col.formula:
                # Formula-based column
                posting_date = self.filters.get("to_date") or getdate()
                value = self.evaluate_formula(employee_id, col.formula, None, posting_date)
                row[field_name] = value
            elif col.source_doctype == "Employee":
                # Employee field
                value = self.get_field_value(employee_doc, col)
                row[field_name] = value
            elif col.source_doctype == "Salary Slip" and salary_slip_doc:
                # Salary Slip field
                value = self.get_field_value(salary_slip_doc, col)
                row[field_name] = value
            else:
                # Other doctypes or cases
                value = self.get_doc_field_value(col, employee_id)
                row[field_name] = value
                
        return row
    
    def get_salary_slip_for_employee(self, employee_id):
        """
        Get the most recent salary slip for an employee in the reporting period.
        """
        if not employee_id or not self.filters.get("from_date") or not self.filters.get("to_date"):
            return None
            
        try:
            slip_list = frappe.get_all(
                "Salary Slip",
                filters={
                    "employee": employee_id, 
                    "docstatus": 1,
                    "start_date": ["between", [self.filters.get("from_date"), self.filters.get("to_date")]]
                },
                fields=["name"],
                order_by="start_date desc",
                limit=1
            )
            
            if slip_list:
                return frappe.get_doc("Salary Slip", slip_list[0].name)
                
        except Exception as e:
            frappe.log_error(f"Error fetching Salary Slip for {employee_id}: {str(e)}")
            
        return None
    
    def get_doc_field_value(self, column_config, employee_id):
        """
        Get field value from any doctype based on column configuration.
        """
        if not column_config.source_doctype or not column_config.source_field:
            return ""
            
        # Skip if it's a formula-based column (handled separately)
        if column_config.based_on_formula and column_config.formula:
            return ""
            
        try:
            # Create filters for the document query
            filters = self.get_filters_for_doctype(column_config.source_doctype)
            
            # Add employee filter if applicable
            if column_config.source_doctype != "Employee":
                meta = frappe.get_meta(column_config.source_doctype)
                if meta.get_field("employee"):
                    filters["employee"] = employee_id
            else:
                filters["name"] = employee_id
                
            # Query for the document
            doc_list = frappe.get_all(
                column_config.source_doctype,
                filters=filters,
                fields=["name"],
                order_by="modified desc",
                limit=1
            )
            
            if doc_list:
                doc = frappe.get_doc(column_config.source_doctype, doc_list[0].name)
                return self.get_field_value(doc, column_config)
                
        except Exception as e:
            frappe.log_error(f"Error in get_doc_field_value: {str(e)}")
            
        return ""
    
    def get_filters_for_doctype(self, doctype):
        """
        Generate filters for document queries based on report filters
        """
        filters = {}
        
        # Add company filter if available
        if self.filters.get("company"):
            filters["company"] = self.filters.get("company")
        
        # For Salary Slip, add filter to only include submitted documents
        if doctype == "Salary Slip":
            filters["docstatus"] = 1  # 1 means submitted documents
        
        # Handle date range filters properly    
        if self.filters.get("from_date") and self.filters.get("to_date"):
            # Define the appropriate date field based on doctype
            if doctype == "Salary Slip":
                filters["start_date"] = ["between", [self.filters.get("from_date"), self.filters.get("to_date")]]
            elif doctype == "Employee":
                # Employee doctype might not have a posting_date field
                # Skip date filtering for Employee or use a different field
                pass
            else:
                # For other doctypes, use posting_date
                filters["posting_date"] = ["between", [self.filters.get("from_date"), self.filters.get("to_date")]]
        
        return filters

    def get_field_value(self, doc, column_config):
        value = None
        
        # If based on formula, evaluate formula using our new approach
        if column_config.based_on_formula and column_config.formula:
            # Get employee_id and posting_date from doc
            employee_id = None
            posting_date = None
            
            if doc.doctype == "Employee":
                employee_id = doc.name
                posting_date = self.filters.get("to_date") or getdate()
            elif hasattr(doc, 'employee') and doc.employee:
                employee_id = doc.employee
                posting_date = doc.posting_date if hasattr(doc, 'posting_date') else self.filters.get("to_date") or getdate()
                
            if employee_id:
                value = self.evaluate_formula(employee_id, column_config.formula, None, posting_date)
            return value
        
        # Handle regular fields
        if column_config.source_field:
            meta = frappe.get_meta(column_config.source_doctype)
            field_meta = meta.get_field(column_config.source_field) if meta else None
            
            value = getattr(doc, column_config.source_field, None)
            
            # Convert date fields to YYYYMMDD format
            if field_meta and field_meta.fieldtype == "Date" and value:
                try:
                    date_obj = getdate(value)
                    value = date_obj.strftime("%Y%m%d")
                except Exception as e:
                    frappe.log_error(f"Error converting date: {value}, Error: {str(e)}")
        
        return value

    # Keep the existing evaluate_formula method as is
    def evaluate_formula(self, employee_id, formula, value, posting_date=None):
        """
        Evaluates a formula with access to fields from Employee, SSA, and Salary Slip doctypes.
        """
        # Use the existing implementation for formula evaluation
        # This method is kept unchanged
        if not formula:
            return value
            
        try:
            # --- STEP 1: FETCH ALL REQUIRED DOCUMENTS ---
            # Get employee document
            employee_doc = None
            if employee_id:
                try:
                    employee_doc = frappe.get_doc("Employee", employee_id)
                except Exception as e:
                    frappe.log_error(f"Error fetching Employee {employee_id}: {str(e)}")
            
            # Get salary slip document
            salary_slip_doc = None
            if employee_id and posting_date:
                try:
                    slip_list = frappe.get_all(
                        "Salary Slip",
                        filters={
                            "employee": employee_id, 
                            "docstatus": 1,
                            "posting_date": ["<=", posting_date]
                        },
                        fields=["name"],
                        order_by="posting_date desc",
                        limit=1
                    )
                    
                    if slip_list:
                        salary_slip_doc = frappe.get_doc("Salary Slip", slip_list[0].name)
                except Exception as e:
                    frappe.log_error(f"Error fetching recent Salary Slip for {employee_id}: {str(e)}")
            
            # Get salary structure assignment document
            ssa_doc = None
            if employee_id and posting_date:
                try:
                    ssa_list = frappe.get_all(
                        "Salary Structure Assignment",
                        filters={
                            "employee": employee_id, 
                            "docstatus": 1,
                            "from_date": ["<=", posting_date]
                        },
                        fields=["name"],
                        order_by="from_date desc",
                        limit=1
                    )
                    
                    if ssa_list:
                        ssa_doc = frappe.get_doc("Salary Structure Assignment", ssa_list[0].name)
                except Exception as e:
                    frappe.log_error(f"Error fetching active SSA for {employee_id}: {str(e)}")
            
            # --- STEP 2: BUILD THE EXECUTION ENVIRONMENT ---
            # Create namespace with safe functions and constants
            import math
            import re
            
            # Create a unified namespace that will contain all fields from all documents
            namespace = {
                # Basic constants
                "True": True,
                "False": False,
                "None": None,
                
                # Math functions
                "abs": abs,
                "ceil": math.ceil,
                "floor": math.floor,
                "round": round,
                "max": max,
                "min": min,
                "sum": sum,
                "pow": pow,
                "sqrt": math.sqrt,
                
                # String utilities
                "len": len,
                "str": str,
                "int": lambda x: int(float(x)) if x is not None else 0,
                "float": lambda x: float(x) if x is not None else 0.0,
                "lower": lambda s: str(s).lower() if s is not None else "",
                "upper": lambda s: str(s).upper() if s is not None else "",
                
                # Safe string operations
                "strip": lambda s, chars=None: str(s).strip(chars) if s is not None else "",
                "split": lambda s, sep=None, maxsplit=-1: str(s).split(sep, maxsplit) if s is not None else [],
                "replace": lambda s, old, new, count=-1: str(s).replace(old, new, count) if s is not None else "",
                "startswith": lambda s, prefix: str(s).startswith(prefix) if s is not None else False,
                "endswith": lambda s, suffix: str(s).endswith(suffix) if s is not None else False,
                "contains": lambda s, substr: substr in str(s) if s is not None else False,
                
                # Original value passed to the function
                "value": value
            }
            
            # --- STEP 3: ANALYZE FORMULA TO IDENTIFY NEEDED FIELDS ---
            def extract_field_names(formula):
                """Extract all potential field names from a formula"""
                field_pattern = re.compile(r'\b([a-zA-Z_][a-zA-Z0-9_]*)\b')
                matches = field_pattern.findall(formula)
                
                # Filter out Python keywords and built-ins
                python_keywords = [
                    "and", "or", "not", "if", "else", "elif", "for", "while", "in", 
                    "is", "True", "False", "None", "return", "break", "continue",
                    # Math functions
                    "abs", "ceil", "floor", "round", "max", "min", "sum", "pow", "sqrt",
                    # String utilities
                    "len", "str", "int", "float", "lower", "upper",
                    # String operations
                    "strip", "split", "replace", "startswith", "endswith", "contains"
                ]
                
                # Return unique field names, excluding Python keywords
                return {match for match in matches if match not in python_keywords and not match.isdigit()}
            
            # Get potential field names from the formula
            field_names = extract_field_names(formula)
            
            # Log found field names for debugging
            frappe.log_error(f"Potential field names in formula: {', '.join(field_names)}")
            
            # Ensure these fields are loaded into the namespace
            for field_name in field_names:
                # Check if this field exists in any document and ensure it's in the namespace
                for doc_prefix, doc_object in [
                    ("employee_", employee_doc), 
                    ("ssa_", ssa_doc), 
                    ("slip_", salary_slip_doc)
                ]:
                    if doc_object and hasattr(doc_object, field_name):
                        field_value = getattr(doc_object, field_name)
                        # Add with prefix and without prefix
                        namespace[f"{doc_prefix}{field_name}"] = field_value
                        namespace[field_name] = field_value
                
                # Also check for this name in salary components (by name or abbreviation)
                if salary_slip_doc:
                    # Check in earnings
                    if hasattr(salary_slip_doc, "earnings"):
                        for earning in salary_slip_doc.earnings:
                            if earning.salary_component == field_name or getattr(earning, "abbr", "") == field_name:
                                namespace[field_name] = earning.amount or 0
                                break
                    
                    # Check in deductions
                    if hasattr(salary_slip_doc, "deductions"):
                        for deduction in salary_slip_doc.deductions:
                            if deduction.salary_component == field_name or getattr(deduction, "abbr", "") == field_name:
                                namespace[field_name] = deduction.amount or 0
                                break
            
            # --- STEP 4: EVALUATE THE FORMULA ---
            try:
                # First attempt: evaluate the formula directly with all fields in the namespace
                result = eval(formula, {"__builtins__": {}}, namespace)
                
                # Format the result appropriately
                if isinstance(result, (int, float)):
                    return f"{result:.2f}" if isinstance(result, float) else str(result)
                elif result is None:
                    return ""
                return str(result)
                
            except Exception as e:
                # Log the error for debugging
                frappe.log_error(
                    f"Formula evaluation failed: {formula}, Error: {str(e)}, "
                    f"Employee ID: {employee_id}, Posting Date: {posting_date}"
                )
                
                # Provide sensible defaults based on formula pattern
                if any(op in formula for op in [".split", ".strip"]):
                    return ""  # String operations
                elif any(op in formula for op in ["+", "-", "*", "/", "%"]):
                    return "0"  # Numeric operations
                else:
                    return "" if value is None else str(value)  # Default fallback
                
        except Exception as e:
            # Log the overall error
            frappe.log_error(
                f"Error in evaluate_formula: {formula}, Error: {str(e)}, "
                f"Employee ID: {employee_id}, Posting Date: {posting_date}"
            )
            return "" if value is None else str(value)
    
    def get_formatted_data(self):
        """
        Returns formatted data for export purposes
        """
        # Get column headers (labels)
        headers = [col["label"] for col in self.columns]
        
        # Format all data rows
        formatted_data = []
        for row in self.data:
            formatted_row = []
            for col in self.columns:
                formatted_row.append(row.get(col["fieldname"], ""))
            formatted_data.append(formatted_row)
        
        return headers, self.code_fields, formatted_data

def execute(filters=None):
    report = MonthlyPayrollTaxSystemReport(filters)
    columns, data = report.run()
    return columns, data


@frappe.whitelist()
def export_report(filters, format="csv"):
    """
    Export the report data with code_field as second row.
    Args:
        filters: JSON string of report filters
        format: "csv" or "xlsx"
    Returns:
        URL to the generated file
    """
    if isinstance(filters, str):
        filters = json.loads(filters)
    
    # Run the report
    report = MonthlyPayrollTaxSystemReport(filters)
    report.run()
    
    # Get formatted data for export
    headers, code_fields, data = report.get_formatted_data()
    
    # Generate company name prefix for the filename
    company = filters.get("company", "Company")
    from_date = filters.get("from_date", "")
    to_date = filters.get("to_date", "")
    date_suffix = ""
    if from_date and to_date:
        date_suffix = f"_{from_date}_to_{to_date}"
    
    filename = f"{company}_tax_report{date_suffix}"
    
    if format.lower() == "csv":
        return export_as_csv(filename, headers, code_fields, data)
    else:  # xlsx
        # XLSX export functionality would be implemented here
        return export_as_csv(filename, headers, code_fields, data)  # Fallback to CSV


def export_as_csv(filename, headers, code_fields, data):
    """Export data as CSV with UTF-8 encoding"""
    # Create a StringIO object
    output = io.StringIO()
    
    # Create CSV writer with UTF-8 encoding
    writer = csv.writer(output, quoting=csv.QUOTE_NONNUMERIC)
    
    # Write headers
    writer.writerow(headers)
    
    # Write code fields as second row
    writer.writerow(code_fields)
    
    # Write data rows
    for row in data:
        writer.writerow(row)
    
    # Get the CSV content
    csv_content = output.getvalue()
    output.close()
    
    # Add UTF-8 BOM
    csv_content = '\ufeff' + csv_content
    
    # Save as a file in Frappe
    file_url = save_temp_file(f"{filename}.csv", csv_content)
    return file_url


def save_temp_file(filename, content):
    """Save content as temporary file and return URL"""
    # Save file in Frappe's public folder
    file_doc = save_file(
        fname=filename,
        content=content,
        dt="Monthly Payroll Tax System",  # Related doctype
        dn="Report",  # Related docname
        folder="Home/Attachments",  # Folder path
        is_private=0  # Public file
    )
    
    # Return the file URL
    return file_doc.file_url