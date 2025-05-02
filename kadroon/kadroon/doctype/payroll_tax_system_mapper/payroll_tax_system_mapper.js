// This file contains the updated code for the formula builder with:
// 1. Dynamic Salary Slip fields instead of fixed ones
// 2. Added Python-style conditional operators
// 3. Made the interface more user-friendly

frappe.ui.form.on('Payroll Tax System Mapper', {
    refresh: function (frm) {
        frm.add_custom_button(__('أضف الأعمدة'), function () {
            // Your data as a list of dictionaries
            const jsonFilePath = '/assets/kadroon/data/payroll_columns_mapping.json?ver=4';

            console.log("Loading JSON from:", jsonFilePath);

            // Fetch the JSON file
            fetch(jsonFilePath)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(data => {
                    addRowsFromData(frm, data);
                })
                .catch(error => {
                    console.error("Error loading JSON:", error);
                    frappe.msgprint(__(`Error loading data file: ${error.message}`));
                });
        });
    },
});

// Process the data and add rows to child table
function addRowsFromData(frm, data) {
    if (!Array.isArray(data)) {
        frappe.msgprint(__('Expected an array of items in the data file'));
        return;
    }

    let addedCount = 0;
    let duplicates = [];

    data.forEach(item => {
        // Check if column_name already exists in the child table
        const isDuplicate = frm.doc.report_columns.some(existing =>
            existing.column_name === item.column_name
        );

        if (!isDuplicate || isDuplicate) {
            const child = frm.add_child('report_columns');
            child.column_name = item.column_name;
            child.code_field = item.code_field;
            child.source_doctype = item.source_doctype || "";
            child.source_field = item.source_field || "";
            child.auto_fill = item.auto_fill || false;
            child.based_on_formula = item.based_on_formula || false;
            child.formula = item.formula || "";
            addedCount++;
        } else {
            duplicates.push(item.column_name);
        }
    });

    // Refresh the child table
    frm.refresh_field('report_columns');

    // Show result messages
    if (addedCount > 0) {
        frappe.show_alert({
            message: __(`${addedCount} rows added successfully`),
            indicator: 'green'
        }, 3);
    }

    if (duplicates.length > 0) {
        frappe.show_alert({
            message: __(`${duplicates.length} duplicate(s) found: ${duplicates.join(', ')}`),
            indicator: 'orange'
        }, 5);
    }
}

// Function to check for duplicate column names
function checkDuplicateColumnName(frm, currentRow) {
    const childTable = frm.doc.report_columns;

    if (!currentRow.column_name) return;

    let duplicateCount = 0;

    // Count occurrences of this column_name
    childTable.forEach(row => {
        if (row.column_name === currentRow.column_name && row.name !== currentRow.name) {
            duplicateCount++;
        }
    });

    if (duplicateCount > 0) {
        frappe.show_alert({
            message: __(`Warning: "${currentRow.column_name}" already exists in the table`),
            indicator: 'red'
        }, 4);
    }
}

frappe.ui.form.on('Payroll Tax System Mapper Column', {
    form_render: function (frm, cdt, cdn) {
        // Add the formula builder button next to the formula field label
        setTimeout(function () {
            // Get the appropriate grid row based on the index
            const formulaWrapper = frm.fields_dict.report_columns.grid.grid_rows[(locals[cdt][cdn].idx) - 1].grid_form.fields_dict.formula.$wrapper;

            // Check if button already exists to avoid duplicates
            if (formulaWrapper.find('.formula-builder-btn').length === 0) {
                formulaWrapper.find('.control-label').append(
                    ' <button class="btn btn-xs btn-default formula-builder-btn" style="margin-left: 10px;"><i class="fa fa-calculator"></i> Formula Builder</button>'
                );

                formulaWrapper.find('.formula-builder-btn').on('click', function () {
                    show_formula_builder_popup(frm, cdt, cdn);
                    return false;
                });
            }
        }, 100); // Small delay to ensure DOM is ready
        const row = locals[cdt][cdn];
        if (!row.based_on_formula) {
            load_doctype_fields(frm, cdt, cdn);
        }
    },

    source_doctype: function (frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        if (!row.based_on_formula) {
            load_doctype_fields(frm, cdt, cdn);
        }
    },
    based_on_formula: function (frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        if (!row.based_on_formula) {
            load_doctype_fields(frm, cdt, cdn);
        } else {
            setTimeout(function () {
                // Get the appropriate grid row based on the index
                const formulaWrapper = frm.fields_dict.report_columns.grid.grid_rows[(locals[cdt][cdn].idx) - 1].grid_form.fields_dict.formula.$wrapper;

                // Check if button already exists to avoid duplicates
                if (formulaWrapper.find('.formula-builder-btn').length === 0) {
                    formulaWrapper.find('.control-label').append(
                        ' <button class="btn btn-xs btn-default formula-builder-btn" style="margin-left: 10px;"><i class="fa fa-calculator"></i> Formula Builder</button>'
                    );

                    formulaWrapper.find('.formula-builder-btn').on('click', function () {
                        show_formula_builder_popup(frm, cdt, cdn);
                        return false;
                    });
                }
            }, 100); // Small delay to ensure DOM is ready
        }
    }
});

// Load all fields from the selected DocType
function load_doctype_fields(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    if (!row.source_doctype) return;

    // Get the current grid row index
    const row_idx = (locals[cdt][cdn].idx) - 1;

    // Clear current options for source_field
    frm.fields_dict.report_columns.grid.update_docfield_property('source_field', 'options', '');

    // Get fields for the selected doctype
    frappe.call({
        method: 'kadroon.kadroon.doctype.payroll_tax_system_mapper_column.payroll_tax_system_mapper_column.get_doctype_fields',
        args: {
            doctype_name: row.source_doctype
        },
        callback: function (r) {
            if (r.message) {
                // Update the options for the source_field
                frm.fields_dict.report_columns.grid.update_docfield_property('source_field', 'options', r.message.join('\n'));

                // If the grid form is available, update the field
                if (frm.fields_dict.report_columns.grid.grid_rows[row_idx] &&
                    frm.fields_dict.report_columns.grid.grid_rows[row_idx].grid_form) {

                    // Make source_field visible
                    frm.fields_dict.report_columns.grid.grid_rows[row_idx].grid_form.fields_dict.source_field.$wrapper.removeClass('hide-control');

                    // Set options in the autocomplete field
                    const sourceField = frm.fields_dict.report_columns.grid.grid_rows[row_idx].grid_form.fields_dict.source_field;
                    if (sourceField.df) {
                        sourceField.df.options = r.message;
                        sourceField.refresh();
                        frm.fields_dict.report_columns.grid.grid_rows[row_idx].grid_form.render()
                    }
                }
            }
            frm.refresh_field("report_columns");
        }
    });
}

// Load child table fields based on the selected DocType
function load_child_fields(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    if (!row.source_doctype) return;

    // Get the current grid row index
    const row_idx = (locals[cdt][cdn].idx) - 1;

    // For Salary Slip, we know we need to load salary components
    if (row.source_doctype === 'Salary Slip') {
        frappe.call({
            method: 'kadroon.kadroon.doctype.payroll_tax_system_mapper_column.payroll_tax_system_mapper_column.get_salary_components',
            callback: function (r) {
                if (r.message) {
                    // Update the options for the child_field
                    frm.fields_dict.report_columns.grid.update_docfield_property('child_field', 'options', r.message.join('\n'));

                    // If the grid form is available, update the field
                    if (frm.fields_dict.report_columns.grid.grid_rows[row_idx] &&
                        frm.fields_dict.report_columns.grid.grid_rows[row_idx].grid_form) {

                        // Make child_field visible
                        frm.fields_dict.report_columns.grid.grid_rows[row_idx].grid_form.fields_dict.child_field.$wrapper.removeClass('hide-control');

                        // Set options in the autocomplete field
                        const childField = frm.fields_dict.report_columns.grid.grid_rows[row_idx].grid_form.fields_dict.child_field;
                        if (childField.df) {
                            childField.df.options = r.message;
                            childField.refresh();
                            frm.fields_dict.report_columns.grid.grid_rows[row_idx].grid_form.render()
                        }
                    }
                }
                frm.refresh_field("report_columns")
            }
        });
    }
}

// Show custom formula builder popup that won't close the child table form
function show_formula_builder_popup(frm, cdt, cdn) {
    const row = locals[cdt][cdn];

    // Create a unique ID for this popup instance
    const popupId = 'formula_builder_popup_' + $.now();

    // Create the popup HTML with two-panel layout from the demo
    const popupHtml = `
        <div id="${popupId}" class="formula-builder-popup">
            <div class="formula-builder-popup-content">
                <div class="formula-builder-popup-header">
                    <h3>Formula Builder</h3>
                    <button class="formula-builder-popup-close">&times;</button>
                </div>
                <div class="formula-builder-popup-body">
                    <div class="formula-builder">
                        <div class="left-panel">
                            <div class="panel-header">Available Fields</div>
                            <div class="panel-body">
                                <!-- Field categories will be added here dynamically -->
                            </div>
                        </div>
                        
                        <div class="right-panel">
                            <div class="panel-header">Formula Builder</div>
                            <div class="panel-body">
                                <div class="formula-workspace">
                                    <div class="formula-items">
                                        <div class="formula-placeholder">Click items on the left to build your formula</div>
                                    </div>
                                </div>
                                
                                <button class="btn btn-default" id="clear-button">Clear Formula</button>
                                
                                <div class="formula-result">
                                    <div class="formula-label">Formula Result:</div>
                                    <code class="formula-code"></code>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="formula-builder-popup-footer">
                    <button class="btn btn-primary apply-formula-btn">Apply Formula</button>
                    <button class="btn btn-default cancel-btn">Cancel</button>
                </div>
            </div>
        </div>
        <style>
            .formula-builder-popup {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                z-index: 9999;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            .formula-builder-popup-content {
                background-color: var(--card-bg);
                color: var(--text-color);
                width: 90%;
                max-width: 1200px;
                border-radius: 5px;
                box-shadow: var(--shadow-md);
                display: flex;
                flex-direction: column;
                max-height: 90vh;
            }
            .formula-builder-popup-header {
                padding: 15px;
                border-bottom: 1px solid var(--border-color);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .formula-builder-popup-header h3 {
                margin: 0;
                font-size: 18px;
                color: var(--heading-color);
            }
            .formula-builder-popup-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: var(--text-muted);
            }
            .formula-builder-popup-body {
                padding: 15px;
                overflow-y: auto;
                flex-grow: 1;
            }
            .formula-builder-popup-footer {
                padding: 15px;
                border-top: 1px solid var(--border-color);
                display: flex;
                justify-content: flex-end;
                gap: 10px;
            }
            
            /* Two-panel formula builder styles */
            .formula-builder {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            
            @media (min-width: 768px) {
                .formula-builder {
                    flex-direction: row;
                }
            }
            
            .left-panel, .right-panel {
                flex: 1;
                border: 1px solid var(--border-color);
                border-radius: 5px;
                overflow: hidden;
            }
            
            .panel-header {
                background-color: var(--control-bg);
                padding: 10px 15px;
                font-weight: bold;
                border-bottom: 1px solid var(--border-color);
            }
            
            .panel-body {
                padding: 15px;
                min-height: 400px;
                max-height: 400px;
                overflow-y: auto;
            }
            
            .field-category {
                margin-bottom: 15px;
            }
            
            .category-title {
                font-weight: bold;
                margin-bottom: 8px;
                font-size: 14px;
                color: var(--text-muted);
            }
            
            .fields-container {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-bottom: 15px;
            }
            
            /* New styles for side-by-side salary fields */
            .salary-fields-container {
                margin-bottom: 15px;
            }
            
            .salary-fields-row {
                display: flex;
                gap: 15px;
                margin-bottom: 15px;
            }
            
            .salary-field-col {
                flex: 1;
                min-width: 0; /* For proper flexbox behavior */
            }
            
            .salary-slip-fields-container, 
            .salary-components-container {
                max-height: 200px;
                overflow-y: auto;
                border: 1px solid var(--border-color);
                padding: 8px;
                border-radius: 4px;
            }
            
            .field-item {
                background-color: var(--control-bg);
                border: 1px solid var(--border-color);
                padding: 5px 10px;
                border-radius: 3px;
                font-size: 13px;
                cursor: pointer;
                user-select: none;
                margin-bottom: 5px;
            }
            
            .field-item:hover {
                background-color: var(--bg-color);
            }
            
            .formula-workspace {
                min-height: 100px;
                border: 1px dashed var(--border-color);
                padding: 15px;
                margin-bottom: 15px;
                border-radius: 5px;
                background-color: var(--control-bg);
            }
            
            .formula-placeholder {
                color: var(--text-muted);
                font-style: italic;
            }
            
            .formula-items {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                min-height: 40px;
            }
            
            .formula-item {
                display: inline-block;
                padding: 5px 10px;
                border-radius: 3px;
                font-size: 13px;
                cursor: pointer;
                color: var(--text-color);
            }

            /* Light theme (default) */
            [data-theme="light"] .formula-item {
                background-color: var(--green-50);
                border: 1px solid var(--green-200);
            }

            [data-theme="light"] .formula-item.operator {
                background-color: var(--red-50);
                border-color: var(--red-200);
            }

            [data-theme="light"] .formula-item.function {
                background-color: var(--blue-50);
                border-color: var(--blue-200);
            }
            
            [data-theme="light"] .formula-item.conditional {
                background-color: var(--purple-50);
                border-color: var(--purple-200);
            }

            /* Dark theme */
            [data-theme="dark"] .formula-item {
                background-color: var(--green-900);
                border: 1px solid var(--green-700);
            }

            [data-theme="dark"] .formula-item.operator {
                background-color: var(--red-900);
                border-color: var(--red-700);
            }

            [data-theme="dark"] .formula-item.function {
                background-color: var(--blue-900);
                border-color: var(--blue-700);
            }
            
            [data-theme="dark"] .formula-item.conditional {
                background-color: var(--purple-900);
                border-color: var(--purple-700);
            }
            
            .formula-result {
                margin-top: 15px;
            }
            
            .formula-label {
                font-weight: bold;
                margin-bottom: 5px;
            }
            
            .formula-code {
                font-family: monospace;
                padding: 10px;
                border: 1px solid var(--border-color);
                border-radius: 3px;
                display: block;
                width: 100%;
                box-sizing: border-box;
                color: var(--text-color);
            }
            
            .custom-number-container {
                display: flex;
                margin-top: 8px;
                gap: 8px;
            }
            
            .custom-number-input {
                flex: 1;
                background-color: var(--control-bg);
                color: var(--text-color);
                border-color: var(--border-color);
            }
            
            .custom-number-input::placeholder {
                color: var(--text-muted);
            }
        </style>
    `;

    // Append the popup to the body
    $('body').append(popupHtml);

    // Setup the formula builder inside the popup
    const $popup = $(`#${popupId}`);
    const $leftPanel = $popup.find('.left-panel .panel-body');

    // Populate the left panel with field categories
    populate_field_categories($leftPanel, frm, cdt, cdn, row);

    // Initialize formula workspace functionality
    setup_formula_workspace_handlers($popup, frm, cdt, cdn, row);

    // Handle close button click
    $popup.find('.formula-builder-popup-close, .cancel-btn').on('click', function () {
        $popup.remove();
    });

    // Handle Apply Formula button click
    $popup.find('.apply-formula-btn').on('click', function () {
        // Get the formula result from the popup
        const formula = $popup.find('.formula-code').text();

        // Only apply if formula is not empty
        if (formula.trim() !== '') {
            // Set value in the actual field
            frappe.model.set_value(cdt, cdn, 'formula', formula);

            // Also update the visible editor content
            const formulaField = frm.fields_dict.report_columns.grid.grid_rows[(locals[cdt][cdn].idx) - 1].grid_form.fields_dict.formula;
            if (formulaField && formulaField.editor) {
                formulaField.editor.setValue(formula);
            }
        }

        // Close the popup
        $popup.remove();
    });
}

// Populate field categories in the left panel
function populate_field_categories($leftPanel, frm, cdt, cdn, row) {
    // Create a container for Salary Slip Fields and Salary Components to be side by side
    const $salaryFieldsContainer = $(
        `<div class="salary-fields-container">
            <div class="salary-fields-row">
                <div class="salary-field-col">
                    <div class="field-category">
                        <div class="category-title">Salary Slip Fields</div>
                        <div class="fields-container salary-slip-fields-container">
                            <div style="color: var(--text-muted);">Loading fields...</div>
                        </div>
                    </div>
                </div>
                <div class="salary-field-col">
                    <div class="field-category">
                        <div class="category-title">Salary Components</div>
                        <div class="fields-container salary-components-container">
                            <div style="color: var(--text-muted);">Loading salary components...</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`
    );

    $leftPanel.append($salaryFieldsContainer);

    // Load the actual Salary Slip fields instead of using fixed ones
    if (row.source_doctype === 'Salary Slip') {
        // Fetch the actual fields from the Salary Slip doctype
        frappe.call({
            method: 'kadroon.kadroon.doctype.payroll_tax_system_mapper_column.payroll_tax_system_mapper_column.get_doctype_fields',
            args: {
                doctype_name: 'Salary Slip'
            },
            callback: function (r) {
                if (r.message && r.message.length > 0) {
                    const $container = $leftPanel.find('.salary-slip-fields-container');
                    $container.empty();

                    // Filter out numeric fields that are likely to be important for calculation
                    // const commonFields = [
                    //     'gross_pay', 'net_pay', 'total_deduction', 'base_gross_pay',
                    //     'base_net_pay', 'base_total_deduction', 'rounded_total',
                    //     'base_rounded_total', 'total_working_days', 'payment_days',
                    //     'hour_rate', 'base_hour_rate', 'leave_without_pay',
                    //     'leave_encashment_amount', 'arrear_amount', 'incentives_amount'
                    // ];

                    // // First add common fields for easier access
                    // commonFields.forEach(field => {
                    //     if (r.message.includes(field)) {
                    //         const $fieldItem = $(
                    //             `<div class="field-item" data-value="${field}">${formatFieldLabel(field)}</div>`
                    //         );
                    //         $container.append($fieldItem);
                    //     }
                    // });

                    // Then add other fields that might be numeric
                    r.message.forEach(field => {

                        const $fieldItem = $(
                            `<div class="field-item" data-value="${field}">${formatFieldLabel(field)}</div>`
                        );
                        $container.append($fieldItem);

                    });
                }
            }
        });

        // Fetch the salary components
        frappe.call({
            method: 'kadroon.kadroon.doctype.payroll_tax_system_mapper_column.payroll_tax_system_mapper_column.get_salary_components',
            callback: function (r) {
                if (r.message && r.message.length > 0) {
                    const $container = $leftPanel.find('.salary-components-container');
                    $container.empty();

                    // Add each component as a field item
                    r.message.forEach(component => {
                        // Add earnings button
                        Object.entries(component).forEach(([key, value]) => {
                            const $earningBtn = $(
                                `<div class="field-item" data-value="${value[0]}">${value[1]}: ${key}</div>`
                            );
                            $container.append($earningBtn);
                        })
                    });
                }
            }
        });
    }

    // Add Conditional Category (Python-like)
    add_field_category($leftPanel, 'Conditional Operators', [
        { value: 'if', label: 'if', isConditional: true },
        { value: 'else', label: 'else', isConditional: true },
        { value: '>', label: '> (Greater Than)', isConditional: true },
        { value: '>=', label: '>= (Greater Than or Equal)', isConditional: true },
        { value: '<', label: '< (Less Than)', isConditional: true },
        { value: '<=', label: '<= (Less Than or Equal)', isConditional: true },
        { value: '==', label: '== (Equal To)', isConditional: true },
        { value: '!=', label: '!= (Not Equal To)', isConditional: true },
        { value: ':', label: ': (Then)', isConditional: true }
    ]);

    // Add Math Functions category
    add_field_category($leftPanel, 'Math Functions', [
        { value: 'abs(', label: 'Absolute Value', isFunction: true },
        { value: 'round(', label: 'Round', isFunction: true },
        { value: 'max(', label: 'Maximum', isFunction: true },
        { value: 'min(', label: 'Minimum', isFunction: true }
    ]);

    // Add Operators category
    add_field_category($leftPanel, 'Operators', [
        { value: '+', label: '+ (Add)', isOperator: true },
        { value: '-', label: '- (Subtract)', isOperator: true },
        { value: '*', label: '* (Multiply)', isOperator: true },
        { value: '/', label: '/ (Divide)', isOperator: true },
        { value: '(', label: '(', isOperator: true },
        { value: ')', label: ')', isOperator: true },
        // { value: ',', label: ', (Comma)', isOperator: true },
        { value: ' ', label: 'Space', isOperator: true }
    ]);

    // Add Numbers category with custom number input
    const $numbersCategory = $(
        `<div class="field-category">
            <div class="category-title">Numbers</div>
            <div class="custom-number-container">
                <input type="number" class="custom-number-input form-control" placeholder="Enter number">
                <button class="btn btn-sm btn-default add-custom-number">Add</button>
            </div>
        </div>`
    );
    $leftPanel.append($numbersCategory);

    // Helper function to add a custom number from input
    function add_custom_number() {
        const $input = $numbersCategory.find('.custom-number-input');
        const customNumber = $input.val();

        if (customNumber && !isNaN(customNumber)) {
            // Add the custom number to the formula workspace
            const $workspace = $leftPanel.closest('.formula-builder-popup').find('.formula-items');

            // Remove placeholder if it exists
            const $placeholder = $workspace.find('.formula-placeholder');
            if ($placeholder.length) {
                $placeholder.remove();
            }

            // Add the number as a formula item
            add_formula_item($workspace, {
                value: customNumber,
                label: customNumber
            });

            // Update formula code
            update_formula_code($workspace, $leftPanel.closest('.formula-builder-popup').find('.formula-code'));

            // Clear the input
            $input.val('');
        }
    }

    // Add event handler for custom number button
    $numbersCategory.find('.add-custom-number').on('click', function () {
        add_custom_number();
    });

    // Also trigger on Enter key
    $numbersCategory.find('.custom-number-input').on('keypress', function (e) {
        if (e.which === 13) {
            add_custom_number();
            return false;
        }
    });
}

// Format field labels to be more readable
function formatFieldLabel(field) {
    return field
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Helper function to add a field category to the panel
function add_field_category($panel, title, items) {
    const $category = $(
        `<div class="field-category">
            <div class="category-title">${title}</div>
            <div class="fields-container"></div>
        </div>`
    );

    const $container = $category.find('.fields-container');

    // Add each item to the container
    items.forEach(item => {
        const classes = ['field-item'];
        if (item.isOperator) classes.push('operator');
        if (item.isFunction) classes.push('function');
        if (item.isConditional) classes.push('conditional');

        const $item = $(
            `<div class="${classes.join(' ')}" data-value="${item.value}">${item.label}</div>`
        );
        $container.append($item);
    });

    $panel.append($category);
}

// Setup handlers for the formula workspace
function setup_formula_workspace_handlers($popup, frm, cdt, cdn, row) {
    const $workspace = $popup.find('.formula-items');
    const $formulaCode = $popup.find('.formula-code');
    const $clearButton = $popup.find('#clear-button');

    // Initial value from the current formula
    if (row.formula && row.formula.trim() !== '') {
        // Clear the placeholder if present
        $workspace.empty();

        // Parse the formula into tokens
        // This is a simplified approach - a real implementation would need a proper tokenizer
        let currentFormula = row.formula;
        let tokens = tokenize_formula(currentFormula);

        // Create formula items for each token
        tokens.forEach(token => {
            add_formula_item($workspace, token);
        });

        // Set the initial formula code
        $formulaCode.text(row.formula);
    }

    // Handle field item clicks
    $popup.on('click', '.field-item', function () {
        // Remove placeholder if it exists
        const $placeholder = $workspace.find('.formula-placeholder');
        if ($placeholder.length) {
            $placeholder.remove();
        }

        // Get item data
        const value = $(this).data('value');
        const isOperator = $(this).hasClass('operator');
        const isFunction = $(this).hasClass('function');
        const label = $(this).text();

        // Create formula item
        add_formula_item($workspace, {
            value,
            label,
            isOperator,
            isFunction
        });

        // Update formula code
        update_formula_code($workspace, $formulaCode);
    });

    // Handle clicks on formula items (for removal)
    $workspace.on('click', '.formula-item', function () {
        $(this).remove();

        // Add placeholder if no items left
        if ($workspace.children().length === 0) {
            const $placeholder = $(
                '<div class="formula-placeholder">Click items on the left to build your formula</div>'
            );
            $workspace.append($placeholder);
            $formulaCode.text('');
        } else {
            // Update formula code
            update_formula_code($workspace, $formulaCode);
        }
    });

    // Handle clear button
    $clearButton.on('click', function () {
        $workspace.html('<div class="formula-placeholder">Click items on the left to build your formula</div>');
        $formulaCode.text('');
    });
}

// Add a formula item to the workspace
function add_formula_item($workspace, token) {
    // Create the formula item element
    const $item = $('<div class="formula-item"></div>');

    // Set attributes based on token
    if (typeof token === 'object') {
        // For tokens created from UI
        $item.attr('data-value', token.value);
        $item.text(token.label);

        if (token.isOperator) $item.addClass('operator');
        if (token.isFunction) $item.addClass('function');
    } else {
        // For tokens from tokenization
        $item.attr('data-value', token);
        $item.text(get_display_label(token));

        // Determine token type based on content
        if (['+', '-', '*', '/', '(', ')', ','].includes(token)) {
            $item.addClass('operator');
        } else if (token.endsWith('(')) {
            $item.addClass('function');
        }
    }

    $workspace.append($item);
}

// Get display label for a token
function get_display_label(token) {
    // Map of tokens to their display labels
    const displayMap = {
        '+': '+ (Add)',
        '-': '- (Subtract)',
        '*': '* (Multiply)',
        '/': '/ (Divide)',
        '(': '(',
        ')': ')',
        ',': ', (Comma)',
        'abs(': 'Absolute Value',
        'round(': 'Round',
        'max(': 'Maximum',
        'min(': 'Minimum',
        'gross_pay': 'Gross Pay',
        'net_pay': 'Net Pay',
        'total_deduction': 'Total Deduction',
        'basic_salary': 'Basic Salary',
    };

    // Return mapped display label or the token itself
    return displayMap[token] || token;
}

// Update formula code based on workspace items
function update_formula_code($workspace, $formulaCode) {
    const $items = $workspace.find('.formula-item');
    let formula = '';

    $items.each(function () {
        const value = $(this).data('value');

        // For functions, don't add a space after them
        if (typeof value === 'string' && value.endsWith('(')) {
            formula += value;
        }
        // For operators, add spaces around them for readability
        else if (['+', '-', '*', '/', '(', ')'].includes(value)) {
            if (value === '(' || value === ')') {
                formula += value;
            } else {
                formula += ` ${value} `;
            }
        }
        // For field references
        else {
            formula += value;
        }
    });

    $formulaCode.text(formula.trim());
}

// Tokenize a formula string
function tokenize_formula(formula) {
    // This is a simplified tokenizer that preserves tokens while handling operators properly

    // First mark known tokens so they don't get split
    let processedFormula = formula;

    // Handle function tokens
    const knownFunctions = ['abs(', 'round(', 'max(', 'min(', 'if'];
    knownFunctions.forEach(func => {
        const escapedFunc = func.replace(/\(/g, '\\(');
        processedFormula = processedFormula.replace(new RegExp(escapedFunc, 'g'), `[FUNC:${func}]`);
    });

    // Handle conditional operators
    const conditionalOperators = ['>=', '<=', '==', '!=', '>', '<', ':', 'else'];
    conditionalOperators.forEach(op => {
        // Use a regex that ensures we match the operator as a whole token
        const regex = new RegExp(`([^a-zA-Z0-9_])${op}([^a-zA-Z0-9_])|^${op}([^a-zA-Z0-9_])|([^a-zA-Z0-9_])${op}$|^${op}$`, 'g');

        // Custom replacement function to preserve the surrounding characters
        processedFormula = processedFormula.replace(regex, (match, p1, p2, p3, p4) => {
            if (p1 && p2) return `${p1}[COND:${op}]${p2}`;
            if (p3) return `[COND:${op}]${p3}`;
            if (p4) return `${p4}[COND:${op}]`;
            return `[COND:${op}]`;
        });
    });

    // Handle field references - match valid field names
    const fieldPattern = /[a-zA-Z_][a-zA-Z0-9_]*/g;
    let match;
    let fieldMatches = [];

    // Find all field name matches
    while ((match = fieldPattern.exec(processedFormula)) !== null) {
        // Make sure this isn't part of a function or conditional that was already marked
        if (!processedFormula.substring(match.index - 6, match.index).includes('FUNC:') &&
            !processedFormula.substring(match.index - 6, match.index).includes('COND:')) {
            fieldMatches.push({
                index: match.index,
                text: match[0],
                length: match[0].length
            });
        }
    }

    // Replace field names starting from the end to maintain indices
    for (let i = fieldMatches.length - 1; i >= 0; i--) {
        const field = fieldMatches[i];
        processedFormula =
            processedFormula.substring(0, field.index) +
            `[FIELD:${field.text}]` +
            processedFormula.substring(field.index + field.length);
    }

    // Handle numeric literals
    const numberPattern = /\b\d+(\.\d+)?\b/g;
    const numbers = [];

    // Find all number matches
    while ((match = numberPattern.exec(processedFormula)) !== null) {
        // Verify this isn't inside another token
        if (!processedFormula.substring(match.index - 6, match.index).includes('FUNC:') &&
            !processedFormula.substring(match.index - 6, match.index).includes('COND:') &&
            !processedFormula.substring(match.index - 7, match.index).includes('FIELD:')) {
            numbers.push({
                index: match.index,
                text: match[0],
                length: match[0].length
            });
        }
    }

    // Replace numbers starting from the end to maintain indices
    for (let i = numbers.length - 1; i >= 0; i--) {
        const num = numbers[i];
        processedFormula =
            processedFormula.substring(0, num.index) +
            `[NUM:${num.text}]` +
            processedFormula.substring(num.index + num.length);
    }

    // Split by basic operators while preserving marked tokens
    const operators = ['+', '-', '*', '/', '(', ')', ',', ' '];
    let tokens = [];
    let currentToken = '';
    let inMarkedToken = false;
    let markedTokenContent = '';
    let markedTokenType = '';

    // Process each character
    for (let i = 0; i < processedFormula.length; i++) {
        const char = processedFormula[i];

        // Check for the start of a marked token
        if (char === '[' && processedFormula.substring(i, i + 6) === '[FUNC:') {
            if (currentToken) {
                tokens.push(currentToken);
                currentToken = '';
            }
            inMarkedToken = true;
            markedTokenType = 'FUNC';
            markedTokenContent = '';
            i += 5; // Skip [FUNC:
            continue;
        } else if (char === '[' && processedFormula.substring(i, i + 7) === '[FIELD:') {
            if (currentToken) {
                tokens.push(currentToken);
                currentToken = '';
            }
            inMarkedToken = true;
            markedTokenType = 'FIELD';
            markedTokenContent = '';
            i += 6; // Skip [FIELD:
            continue;
        } else if (char === '[' && processedFormula.substring(i, i + 5) === '[NUM:') {
            if (currentToken) {
                tokens.push(currentToken);
                currentToken = '';
            }
            inMarkedToken = true;
            markedTokenType = 'NUM';
            markedTokenContent = '';
            i += 4; // Skip [NUM:
            continue;
        } else if (char === '[' && processedFormula.substring(i, i + 6) === '[COND:') {
            if (currentToken) {
                tokens.push(currentToken);
                currentToken = '';
            }
            inMarkedToken = true;
            markedTokenType = 'COND';
            markedTokenContent = '';
            i += 5; // Skip [COND:
            continue;
        }

        // Check for the end of a marked token
        if (char === ']' && inMarkedToken) {
            inMarkedToken = false;
            if (markedTokenType === 'FUNC') {
                tokens.push(markedTokenContent);
            } else if (markedTokenType === 'FIELD') {
                tokens.push(markedTokenContent);
            } else if (markedTokenType === 'NUM') {
                tokens.push(markedTokenContent);
            } else if (markedTokenType === 'COND') {
                tokens.push(markedTokenContent);
            }
            continue;
        }

        // Inside a marked token
        if (inMarkedToken) {
            markedTokenContent += char;
            continue;
        }

        // Check for operators
        if (operators.includes(char)) {
            if (currentToken) {
                tokens.push(currentToken);
                currentToken = '';
            }
            tokens.push(char);
        } else {
            currentToken += char;
        }
    }

    // Add any remaining token
    if (currentToken) {
        tokens.push(currentToken);
    }

    // Filter out empty tokens
    return tokens.filter(token => token.trim() !== '');
}