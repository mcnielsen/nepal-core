/**
 *  @author Little Beelzebub <knielsen@alertlogic.com>
 *
 *  @copyright Alert Logic Inc, 2020
 */

/**
 * Describes an objects whose properties can be interrogated/tested using a query's conditions.
 */
export interface AlQuerySubject {
    getPropertyValue( property:string, ns:string ):any;
}

type BaseValue = string | number | boolean | null | undefined;
type Descriptor = { source: string | { ns: string; id: string; } };
type OpCompare = [Descriptor, BaseValue];
type OpCompareNum = [Descriptor, number];

type BaseOp =
    OpAnd
    | OpOr
    | OpEqual
    | OpNotEqual
    | OpLessThan
    | OpLessThanEqual
    | OpGreaterThan
    | OpGreaterThanEqual
    | OpIn
    | OpNot
    | OpIsNull
    | OpContains
    | OpContainsAny
    | OpContainsAll;

type BaseOps = BaseOp[];

type OpAnd = { and: BaseOps };
type OpOr = { or: BaseOps };
type OpEqual = { '=': OpCompare };
type OpNotEqual = { '!=': OpCompare };
type OpLessThan = { '<': OpCompareNum };
type OpLessThanEqual = { '<=': OpCompareNum };
type OpGreaterThan = { '>': OpCompareNum };
type OpGreaterThanEqual = { '>=': OpCompareNum };
type OpIn = { 'in': [ Descriptor, BaseValue[] ] };
type OpNot = { 'not': BaseOp };
type OpIsNull = { 'isnull': [Descriptor] };
type OpContains = { 'contains': OpCompare };
type OpContainsAny = { 'contains_any': [Descriptor, any] };
type OpContainsAll = { 'contains_all': [Descriptor, any] };

export class AlQueryEvaluator
{
    constructor( public queryDescriptor:BaseOp, public id?:string ) {
    }

    public test( subject:AlQuerySubject, queryDescriptor?:BaseOp ):boolean {
        return this.dispatchOperator( queryDescriptor || this.queryDescriptor, subject );
    }

    /**
     *  The following dispatch/evaluate methods are support methods used to actually test a search condition against a target object.
     *  The evaluative functionality of SQXSearchQuery doesn't necessarily encompass the full range of operators supported by log search.
     */

    protected dispatchOperator( op:BaseOp, subject:AlQuerySubject ):boolean {
        const operatorKeys = Object.keys( op );
        this.assert( op, operatorKeys.length === 1, "an operator descriptor should have a single key." );
        const operatorKey = operatorKeys[0] as keyof BaseOp;
        const operatorValue: any = op[operatorKey];
        switch( operatorKey ) {
            case "and" :
                return this.evaluateAnd( operatorValue, subject );
            case "or" :
                return this.evaluateOr( operatorValue, subject );
            case "=" :
                return this.evaluateEquals( operatorValue, subject );
            case "!=" :
                return this.evaluateNotEquals( operatorValue, subject );
            case "<" :
                return this.evaluateLT( operatorValue, subject );
            case "<=" :
                return this.evaluateLTE( operatorValue, subject );
            case ">" :
                return this.evaluateGT( operatorValue, subject );
            case ">=" :
                return this.evaluateGTE( operatorValue, subject );
            case "in":
                return this.evaluateIn( operatorValue, subject );
            case "not" :
                return this.evaluateNot( operatorValue, subject );
            case "isnull" :
                return this.evaluateIsNull( operatorValue, subject );
            case "contains" :
                return this.evaluateContains( operatorValue, subject );
            case "contains_all" :
                return this.evaluateContainsAll( operatorValue, subject );
            case "contains_any" :
                return this.evaluateContainsAny( operatorValue, subject );
            default :
                throw new Error(`Cannot evaluate unknown operator '${operatorKey}'` );
        }
    }

    protected evaluateAnd( op:BaseOps, subject:AlQuerySubject ):boolean {
        this.assert( op, Array.isArray(op) && op.length > 0, "`and` descriptor should consist of an array of non-zero length" );
        return op.every( i =>  this.dispatchOperator( i, subject ) );

    }

    protected evaluateOr( op:BaseOps, subject:AlQuerySubject ):boolean {
        this.assert( op, Array.isArray(op) && op.length > 0, "`and` descriptor should consist of an array of non-zero length" );
        return op.some(i => this.dispatchOperator(i,  subject));
    }

    protected evaluateEquals( op:OpCompare, subject:AlQuerySubject ):boolean {
        this.assert( op, Array.isArray(op) && op.length === 2, "`=` descriptor should have two elements" );
        const property = this.normalizeProperty( op[0] );
        const actualValue = subject.getPropertyValue( property.id, property.ns );
        const testValue = op[1];

        return actualValue === testValue;
    }

    protected evaluateNotEquals( op:OpCompare, subject:AlQuerySubject ):boolean {
        this.assert( op, Array.isArray(op) && op.length === 2, "`!=` descriptor should have two elements" );
        const property = this.normalizeProperty( op[0] );
        const actualValue = subject.getPropertyValue( property.id, property.ns );
        const testValue = op[1];

        return actualValue !== testValue;
    }

    protected evaluateLT( op:OpCompareNum, subject:AlQuerySubject ):boolean {
        this.assert( op, Array.isArray(op) && op.length === 2, "`<` descriptor should have two elements" );
        const property = this.normalizeProperty( op[0] );
        const actualValue = subject.getPropertyValue( property.id, property.ns );
        const testValue = op[1];

        return actualValue < testValue;
    }

    protected evaluateLTE( op:OpCompareNum, subject:AlQuerySubject ):boolean {
        this.assert( op, Array.isArray(op) && op.length === 2, "`<=` descriptor should have two elements" );
        const property = this.normalizeProperty( op[0] );
        const actualValue = subject.getPropertyValue( property.id, property.ns );
        const testValue = op[1];

        return actualValue <= testValue;
    }

    protected evaluateGT( op:OpCompareNum, subject:AlQuerySubject ):boolean {
        this.assert( op, Array.isArray(op) && op.length === 2, "`>` descriptor should have two elements" );
        const property = this.normalizeProperty( op[0] );
        const actualValue = subject.getPropertyValue( property.id, property.ns );
        const testValue = op[1];

        return actualValue > testValue;
    }

    protected evaluateGTE( op:OpCompareNum, subject:AlQuerySubject ):boolean {
        this.assert( op, Array.isArray(op) && op.length === 2, "`>=` descriptor should have two elements" );
        const property = this.normalizeProperty( op[0] );
        const actualValue = subject.getPropertyValue( property.id, property.ns );
        const testValue = op[1];

        return actualValue >= testValue;
    }

    protected evaluateIn( op:[Descriptor,unknown[]], subject:AlQuerySubject ):boolean {
        this.assert( op, Array.isArray(op) && op.length === 2, "`in` descriptor should have two elements" );
        const property = this.normalizeProperty( op[0] );
        const actualValue = subject.getPropertyValue( property.id, property.ns );
        const testValues = op[1];
        this.assert( testValues, Array.isArray(testValues), "`in` values clause must be an array" );
        return testValues.includes( actualValue );
    }

    protected evaluateNot( op:BaseOp, subject:AlQuerySubject ):boolean {
        return !this.dispatchOperator( op, subject );
    }

    protected evaluateIsNull( op:[Descriptor], subject:AlQuerySubject ):boolean {
        this.assert( op, Array.isArray(op) && op.length === 1, "`isnull` descriptor should have one element" );
        const property = this.normalizeProperty( op[0] );
        const actualValue = subject.getPropertyValue( property.id, property.ns );
        return ( actualValue === null || actualValue === undefined );
    }

    protected evaluateContains( op:[Descriptor, any], subject:AlQuerySubject ):boolean {
        this.assert( op, Array.isArray(op) && op.length === 2, "`contains` descriptor should have two elements" );
        const property = this.normalizeProperty( op[0] );
        const actualValues = subject.getPropertyValue( property.id, property.ns );
        if ( actualValues === null || actualValues === undefined ) {
            return false;
        }
        this.assert( actualValues, typeof( actualValues ) === 'object', "`contains` operator must reference a property that is an object or an array" );
        const testValue = op[1];
        return actualValues.includes( testValue );
    }

    protected evaluateContainsAny( op:[Descriptor, any[]], subject:AlQuerySubject ):boolean {
        this.assert( op, Array.isArray(op) && op.length === 2, "`contains_any` descriptor should have two elements" );
        const property = this.normalizeProperty( op[0] );
        const actualValues = subject.getPropertyValue( property.id, property.ns );
        if ( actualValues === null || actualValues === undefined ) {
            return false;
        }
        this.assert( actualValues, typeof( actualValues ) === 'object', "`contains_any` operator must reference a property that is an object or an array" );
        const testValues = op[1];
        this.assert( testValues, Array.isArray(testValues), "`contains_any` values clause must be an array" );
        return testValues.some( value  => {
            if ( Array.isArray(actualValues)) {
                return actualValues.includes( value );
            } else {
                return actualValues.hasOwnProperty( value ) && !!actualValues[value];
            }
        });
    }

    protected evaluateContainsAll( op:[Descriptor,any[]], subject:AlQuerySubject ):boolean {
        this.assert( op, Array.isArray(op) && op.length === 2, "`contains_all` descriptor should have two elements" );
        const property = this.normalizeProperty( op[0] );
        const actualValues = subject.getPropertyValue( property.id, property.ns );
        if ( actualValues === null || actualValues === undefined ) {
            return false;
        }
        this.assert( actualValues, typeof( actualValues ) === 'object', "`contains_all` operator must reference a property that is an object or an array" );
        const testValues = op[1];
        this.assert( testValues, Array.isArray(testValues), "`contains_all` values clause must be an array" );
        return testValues.every(value =>{
            if ( Array.isArray(actualValues) ) {
                return actualValues.includes( value );
            } else {
                return actualValues.hasOwnProperty( value ) && !!actualValues[value];
            }
        });
    }

    protected normalizeProperty( descriptor:Descriptor ):{ns:string,id:string} {
        this.assert( descriptor, descriptor.hasOwnProperty("source"), "property reference must include a `source` property" );
        const propertyRef = descriptor.source;
        let propertyName;
        let propertyNs = "default";
        if ( typeof propertyRef === 'object' && propertyRef.hasOwnProperty("ns") && propertyRef.hasOwnProperty("id") ) {
            propertyNs = propertyRef.ns;
            propertyName = propertyRef.id;
        } else if ( typeof( propertyRef ) === 'string' ) {
            propertyName = propertyRef;
        } else {
            throw new Error(`Invalid property reference [${JSON.stringify(descriptor)}] in condition descriptor` );
        }
        return { ns: propertyNs, id: propertyName };
    }

    protected assert( subject:unknown, value:boolean, message:string ) {
        if ( !value ) {
            console.warn("Invalid conditional element", subject );
            throw new Error( `Failed to interpret condition descriptor: ${message}` );
        }
    }
}

