# About Forms...

This interface defines a subset of the shape of data for the data-driven ("dynamic") forms module, @al/ng-forms-components.

It is provided _only_ for the convenience of API client interfaces that are not angular-aware but need to define interfaces
for services that return form definitions.  In general, different types of form elements may have additional properties --
sometimes lots and lots of them!

However, the detailed structure of form definitions belongs to @al/ng-forms-components.  Therefore, please don't add any
properties to this interface *unless* it is truly a generic property that may be used by non angular-aware code.
