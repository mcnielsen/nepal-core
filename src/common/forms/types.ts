export interface AlDynamicFormControlElementOptions {
    label: string;
    value: string;
}

export interface AlDynamicFormControlElement {
    updateNotAllowed?: boolean;
    type: string;
    property: string;
    label: string;
    secret?: string;
    description?: string;
    defaultValue?: string | string[] | boolean;
    validationPattern?: string;
    optional?: boolean;
    options?: AlDynamicFormControlElementOptions[];
    editorOptions?: any;
    placeholder?: string;
    aboveDescription?: string;
    belowDescription?: string;
}
