# Copyright (c) 2025, Innomate LLC and contributors
# For license information, please see license.txt

from erpnext.setup.doctype.employee.employee import Employee
import frappe

class EmployeeKadroon(Employee):
    def before_save(self):
        nationality_codes = {
            "مصرى - بعقد": "01",
            "اجنبى - بعقد": "02",
            "مصرى - بدون عقد": "03",
            "اجنبى - بدون عقد": "04",
            "مصرى - عمالة يومية": "05"
            }
        nationality = f"{self.nationality} - {self.by_contract}"
        self.nationality_code = nationality_codes.get(nationality, "")