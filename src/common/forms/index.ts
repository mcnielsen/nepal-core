/**
 * Please see README before adding properties here :)
 */

export interface AlDynamicFormControlElement<Type=any> {
    type: string;
    property: string;
    label?: string;
    secret?: boolean;
    description?: string;
    value?: Type;
    defaultValue?: Type;
    optional?: boolean;
    options?: {
        label: string;
        value: Type;
    }[];
}
