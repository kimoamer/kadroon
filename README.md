# Kadroon

**Kadroon** is a custom ERPNext app that adds official Egpytian Income Taxes fields to the Employee doctype, based on offical templates and government reporting standards. Designed for HR teams and payroll administrators who need standardized, compliant employee data structures.

## 📌 Features

- Adds structured custom fields to the Employee doctype.
- Fields follow Private Sector payroll templates and codes (e.g., `EI010`, `NAD635`).
- Arabic labels with mapped fieldnames for easy form matching.
- Ready for integration with government reporting formats.


## 🚀 Installation

To install Kadroon on your ERPNext site:

```bash
# Get the app
bench get-app https://github.com/kimoamer/kadroon.git

# Install it on your site
bench --site your-site-name install-app kadroon
```

> ⚠️ Kadroon requires ERPNext & Frappe HR to be installed on the site.

## 🧩 Usage

After installation, Kadroon will automatically add custom fields to the **Employee** doctype.

You can:
- View and manage the fields under **Customize Form** > Employee
- Use them in reports, scripts, or custom print formats
- Export official forms easily with aligned data structure

## 🗂️ Example Fields

| Field Label (Arabic)                       | Fieldname | Description                                      |
|-------------------------------------------|-----------|--------------------------------------------------|
| الجنسية                                    | nationality     | Nationality                                      |
| الرقم القومي                                | nationa_id     | National ID Number                               |
| رقم تصريح العمل                           | work_permit_number    | Work Permit Number                              |
| رقم جواز السفر          | passport_number    | Passport Number           |
| حالة تصريح العمل لغير المصريين                 | work_permit_status    | Work Permit Status                     |

## ✅ Compatibility

- ERPNext v15
- HRMS v15
- Frappe Framework v15

## 🤝 Contributing

Contributions, issues, and suggestions are welcome! Please open an issue or fork the repo and submit a pull request.

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](license.txt) file for details.

---

Made with ❤️ by [@kimoamer](https://github.com/kimoamer) for better payroll compliance and HR data management.