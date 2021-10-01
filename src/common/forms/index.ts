/**
 * Please see README before adding properties here :)
 */

export type AlDynamicFormControlElementOptions = any;

export type AlDynamicFormControlInputResponderOptions = any;

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
        disabled?: boolean;
    }[];

    /**
     * Deprecation alert!  These properties will go away in the future, so try not to use them :)
     */
    title?:string;
    disabled?:boolean;
    dataType?:string;
    updateNotAllowed?:boolean;
    validationPattern?:string;
    editorOptions?:any;
    responderOptions?:any;
    placeholder?:string;
    aboveDescription?:string;
    belowDescription?:string;
    patternError?:string;
    requiredError?:string;
    minLengthError?:string;
    maxLengthError?:string;
    joinExpression?:string;
    joinExpresion?:string;
    splitExpression?:RegExp|string;
    splitExpresion?:RegExp|string;
    multiSelectOptions?:any;
    treeSelectOptions?:any;
    minLength?:number;
    maxLength?:number;
    minValue?:number;
    maxValue?:number;
    onNodeSelected?:any;
    onNodeUnselected?:any;
    columns?:any;
    cssClass?:string;
}
