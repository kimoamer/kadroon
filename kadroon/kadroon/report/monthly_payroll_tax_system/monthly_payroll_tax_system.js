// Copyright (c) 2025, Innomate LLC and contributors
// For license information, please see license.txt

frappe.query_reports["Monthly Payroll Tax System"] = {
	"filters": [
		{
			"fieldname": "company",
			"label": __("Company"),
			"fieldtype": "Link",
			"options": "Company",
			"reqd": 1
		},
		{
			"fieldname": "from_date",
			"label": __("From Date"),
			"fieldtype": "Date",
			"default": frappe.datetime.add_months(frappe.datetime.get_today(), -1),
			"reqd": 1
		},
		{
			"fieldname": "to_date",
			"label": __("To Date"),
			"fieldtype": "Date",
			"default": frappe.datetime.get_today(),
			"reqd": 1
		}
	],
	
	onload: function(report) {
		report.page.add_inner_button(__("Download CSV (UTF-8)"), function() {
			downloadReportWithFormat(report, "csv");
		});
		
		report.page.add_inner_button(__("Download Excel"), function() {
			downloadReportWithFormat(report, "xlsx");
		});
	}
};

function downloadReportWithFormat(report, format) {
	// Get current filters
	const filters = report.get_values();
	
	// Create a dialog to show download progress
	const dialog = new frappe.ui.Dialog({
		title: __('Downloading...'),
		fields: [
			{
				fieldname: 'progress',
				fieldtype: 'HTML',
				options: '<div class="progress">\
					<div class="progress-bar progress-bar-striped active" role="progressbar"\
						aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" style="width: 100%">\
					</div>\
				</div>'
			}
		]
	});
	
	dialog.show();
	
	// Make a request to the server-side method to generate and get the file URL
	frappe.call({
		method: "kadroon.kadroon.report.monthly_payroll_tax_system.monthly_payroll_tax_system.export_report",
		args: {
			filters: filters,
			format: format
		},
		callback: function(r) {
			dialog.hide();
			if (r.message) {
				// If success, open the file URL
				window.open(r.message, "_blank");
			}
		},
		error: function(err) {
			dialog.hide();
			frappe.msgprint(__("Error generating report: ") + err);
		}
	});
}