# Kadroon

**Kadroon** is a specialized ERPNext application that enhances HR compliance for Egyptian private-sector payroll. It adds standardized custom fields to the Employee doctype based on official Egyptian government templates and reporting standards. Designed for HR teams and payroll administrators who need structured, compliant employee data management.

## 📌 Features

- **Standardized Custom Fields**: Adds structured custom fields to the Employee doctype following Egyptian tax and payroll requirements
- **Official Compliance**: Fields follow Private Sector payroll templates and codes (e.g., `EI010`, `NAD635`)
- **Bilingual Support**: Arabic labels with mapped English fieldnames for easy form matching and data entry
- **Government Integration Ready**: Prepared for integration with Egyptian government reporting formats
- **Seamless ERPNext Integration**: Works within your existing ERPNext environment without disrupting core functionality

## 🚀 Installation

To install Kadroon on your ERPNext site:

```bash
# Get the app
bench get-app https://github.com/kimoamer/kadroon.git --resolve-deps

# Install it on your site
bench --site your-site-name install-app kadroon
```

> ⚠️ Kadroon requires ERPNext & Frappe HR to be installed on the site.

## 🔧 Configuration

After installation, Kadroon automatically adds the required custom fields to the Employee doctype. No additional configuration is needed to start using the fields.

1. Navigate to the Employee doctype in your ERPNext instance
2. You'll find a new "Taxation" tab containing all the Egyptian tax-related fields
3. Fill in the required information for each employee

## 💼 Usage

Kadroon enhances your Employee records with fields required for Egyptian tax compliance:

- **Basic Tax Information**: Nationality, contract type, and tax identification details
- **Standardized Codes**: Uses official Egyptian government field codes for consistency
- **Reporting Ready**: Structured data format compatible with government reporting requirements

### Example Fields

- Nationality (مصرى/اجنبى)
- Contract Type (بعقد/بدون عقد/عمالة يومية)
- Tax Registration Number
- Additional standardized fields following Egyptian payroll requirements

## ✅ Compatibility

- ERPNext v15
- HRMS v15
- Frappe Framework v15

## 🤝 Contributing

Contributions are welcome! If you'd like to improve Kadroon:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the GNU Affero General Public License v3.0. See the [LICENSE](license.txt) file for details.

---

Made with ❤️ by [Innomate LLC](https://github.com/kimoamer) for better payroll compliance and HR data management.

For support or inquiries, contact: info@innomate-tech.com