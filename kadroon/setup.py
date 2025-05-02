# Copyright (c) 2025, Innomate LLC and contributors
# For license information, please see license.txt

import frappe
from frappe.desk.page.setup_wizard.setup_wizard import make_records
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def after_install():
    """
    Add custom fields to existing doctypes after app installation
    """
    create_custom_fields(get_custom_fields())
    # update_property_setters()

def before_uninstall():
    delete_custom_fields(get_custom_fields())

def update_property_setters():
    """
    Update or create Property Setters for a list of fields in a given DocType.

    Args:
        doctype (str): Name of the DocType.
        fields_list (list of dict): List containing field configurations. Each dict should have:
            - fieldname (str): Name of the field.
            - property (str): Property to modify (e.g., 'hidden', 'label').
            - value (str/int/bool): Value to set for the property.
            - property_type (str): Data type of the property (e.g., 'Check', 'Data', 'Text').
    """
    fields_list = [
            {
                "doctype": "Employee",
                "fieldname": "passport_details_section",
                "property": "insert_after",
                "value": "work_permit_number",
                "property_type": "Data"
            }
        ]
    for field in fields_list:
        # Check if Property Setter already exists
        filters = {
            "doc_type": field["doctype"],
            "field_name": field['fieldname'],
            "property": field['property'],
            "doctype_or_field": "DocField"
        }
        property_setter_name = frappe.db.get_value("Property Setter", filters, "name")

        if property_setter_name:
            # Update existing Property Setter
            ps = frappe.get_doc("Property Setter", property_setter_name)
            ps.value = str(field['value'])
            ps.save()
            frappe.db.commit()
        else:
            # Create new Property Setter
            ps = frappe.new_doc("Property Setter")
            ps.doctype_or_field = "DocField"
            ps.doc_type = field["doctype"]
            ps.field_name = field['fieldname']
            ps.property = field['property']
            ps.property_type = field['property_type']
            ps.value = str(field['value'])
            ps.insert()
            frappe.db.commit()

def get_custom_fields():
    """
    Create custom fields in Employee doctype
    """
    return {
        "Employee": [
            {
                "fieldname": "egypt_tax_tab",
                "label": "Taxation",
                "fieldtype": "Tab Break",
                "insert_after": "internal_work_history"
            },
            {
                "fieldname": "egypt_tax_section",
                "label": "Egyptian Tax Information",
                "fieldtype": "Section Break",
                "insert_after": "egypt_tax_tab",
                "collapsible": 0
            },
            {
                "fieldname": "nationality",
                "label": "Nationality",
                "fieldtype": "Select",
                "options": "\nمصرى\nاجنبى",
                "insert_after": "egypt_tax_section",
                "description": "*إجبارى"
            },
            {
                "fieldname": "by_contract",
                "label": "By Contract",
                "fieldtype": "Select",
                "options": "\nبعقد\nبدون عقد\nعمالة يومية",
                "insert_after": "nationality",
                "description": "*إجبارى"
            },
            {
                "fieldname": "nationality_code",
                "label": "Nationality Code",
                "fieldtype": "Select",
                "options": "\n01\n02\n03\n04\n05",
                "insert_after": "by_contract",
                "read_only": 1
            },
            {
                "fieldname": "national_id",
                "label": "National ID Number",
                "fieldtype": "Data",
                "insert_after": "nationality_code",
                "description": "*إجبارى"
            },
            {
                "fieldname": "work_permit_cb",
                "fieldtype": "Column Break",
                "insert_after": "national_id"
            },
            {
                "fieldname": "work_permit_status",
                "label": "Work Permit Status",
                "fieldtype": "Select",
                "options": "\n01 - سارى\n02 - قيد الاستخراج\n03 - لايوجد",
                "insert_after": "work_permit_cb",
                "depends_on": "eval:doc.nationality != 'مصرى'",
                "description": "*إجبارى"
            },
            {
                "fieldname": "work_permit_number",
                "label": "Work Permit Number",
                "fieldtype": "Data",
                "insert_after": "work_permit_status",
                "depends_on": "eval:doc.work_permit_status && doc.nationality != 'مصرى'",
                "description": "*إجبارى"
            },
            {
                "fieldname": "egypt_tax_sb",
                "fieldtype": "Section Break",
                "label": "Tax & Insurance Details",
                "insert_after": "work_permit_number"
            },
            {
                "fieldname": "tax_treatment_type",
                "label": "Tax Treatment Type",
                "fieldtype": "Select",
                "options": "\n01 - العمالة الضريبية الدائمة أو المؤقتة\n02 - عمالة تحاسب بضريبة قطعية (نموذج 2 مرتبات)\n03 - عمالة منتدبة أو معارة (نموذج 3 مرتبات)\n04 - العمالة ذوي الاحتياجات الخاصة (ق 10 لسنة 2018)\n05 - العمالة ذوي الأمراض المزمنة (قرار وزير الصحة رقم 259)\n06 - عمالة الهيئة العامة للمنطقة الاقتصادية\n07 - عمالة الهيئة العامة للمنطقة الاقتصادية ومن ذوي الهمم",
                "insert_after": "egypt_tax_sb",
                "description": "*إجبارى"
            },
            {
                "fieldname": "tax_registration_number",
                "label": "Tax Registration Number",
                "fieldtype": "Data",
                "insert_after": "tax_treatment_type",
                "description": "*إجبارى فى حالة المعاملة 2 او 3 "
            },
            {
                "fieldname": "tax_cb",
                "fieldtype": "Column Break",
                "insert_after": "tax_registration_number"
            },
            {
                "fieldname": "insurance_status",
                "label": "Insurance Status",
                "fieldtype": "Select",
                "options": "\n01 - مؤمن عليه مع عدم تطبيق نظام التأمين الصحي الشامل\n02 - مؤمن عليه مع وجود قرار من الهيئة المعنية بالتأمين الصحي للجهة بالعلاج والرعاية للعاملين\n03 - مؤمن عليه مع وجود قرار من الهيئة القومية للتأمين الاجتماعي بتحمل تعويض الأجر ومصاريف الانتقال\n04 - مؤمن عليه مع وجود قرار بتحمل العلاج والرعاية الطبية وتعويض الأجر ومصاريف الانتقال\n05 - مؤمن عليه مع عدم خضوع التأمين الصحي\n06 - مؤمن عليه مع تطبيق نظام التأمين الصحي الشامل\n07 - مؤمن عليه في جهة ذات حالة وظيفية خاصة (أعمال صعبة)\n08 - مؤمن عليه في جهة ذات حالة وظيفية خاصة (أعمال خطرة)\n09 - مؤمن عليه إصابة عمل بأجر\n10 - مؤمن عليه إصابة عمل بدون أجر\n11 - مؤمن عليه إصابات عمل وتأمين مرض\n12 - المؤمن عليها الحاصلة على إجازة رعاية طفل\n13 - مدة التجنيد\n14 - مؤمن عليه مدد الاستدعاء والاستبقاء للقوات المسلحة\n15 - صاحب عمل\n16 - منتدب إلى الجهة كليًا\n17 - منتدب من الجهة جزئيًا\n18 - منتدب إلى الجهة جزئيًا\n19 - حالات العمل جزء من الوقت\n20 - بعثات علمية\n21 - غير مؤمن عليه\n22 - مؤمن عليه إجازة خاصة لغير العمل بالداخل\n23 - مؤمن عليه إجازة خاصة للعمل بالخارج\n24 - مؤمن عليه طبقًا لبند 1 مادة 63 للائحة التنفيذية لقانون التأمينات الاجتماعية 148 لسنة 2019\n25 - مؤمن عليه طبقًا لبند 2 مادة 63 للائحة التنفيذية لقانون التأمينات الاجتماعية 148 لسنة 2019\n26 - الإجازة الخاصة لغير العمل لمرافقة الزوج (بالخارج)\n27 - مبعوثو الأزهر الشريف بالخارج\n28 - الأنظمة التأمينية البديلة",
                "insert_after": "tax_cb",
                "description": "*إجبارى"
            },
            {
                "fieldname": "insurance_number",
                "label": "Insurance Number",
                "fieldtype": "Data",
                "insert_after": "insurance_status",
                "description": "*إجبارى"
            },
            {
                "fieldname": "insurance_dates_sb",
                "fieldtype": "Section Break",
                "label": "Insurance Dates",
                "insert_after": "insurance_number",
                "depends_on": "eval:doc.insurance_status"
            },
            {
                "fieldname": "insurance_join_date",
                "label": "Insurance Join Date",
                "fieldtype": "Date",
                "insert_after": "insurance_dates_sb"
            },
            {
                "fieldname": "insurance_end_date",
                "label": "Insurance End Date",
                "fieldtype": "Date",
                "insert_after": "insurance_join_date"
            },
            {
                "fieldname": "insurance_cb",
                "fieldtype": "Column Break",
                "insert_after": "insurance_end_date"
            },
            {
                "fieldname": "health_insurance_status",
                "label": "Health Insurance Status",
                "fieldtype": "Select",
                "options": "\n01 - خاضعة\n02 - غير خاضعة",
                "insert_after": "insurance_cb"
            },
            {
                "fieldname": "non_working_spouse_count",
                "label": "Non-working Spouse Count",
                "fieldtype": "Select",
                "options": "\n01\n02\n03\n04",
                "insert_after": "health_insurance_status"
            },
            {
                "fieldname": "dependents_count",
                "label": "Dependents Count",
                "fieldtype": "Int",
                "insert_after": "non_working_spouse_count"
            }
        ]
    }
    
def delete_custom_fields(custom_fields: dict):
    """
    :Removing custom_fields: a dict like `{'Address': [{fieldname: 'eta_*', ...}]}`
    """
    for doctype, fields in custom_fields.items():
        frappe.db.delete(
            "Custom Field",
            {
                "fieldname": ("in", [field["fieldname"] for field in fields]),
                "dt": doctype,
            },
        )

        frappe.clear_cache(doctype=doctype)