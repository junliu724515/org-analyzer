# summary

The data-dictionary feature enables automatic extraction and documentation of metadata from a Salesforce org, offering a detailed overview of objects, fields, and their attributes, including data types, relationships, and descriptions.

# description

By default, it will list all custom objects and all standard objects with at least one custom field. Additionally, you can choose to include or exclude any managed package objects. Above all, a very unique feature is the ability to crawl objects through their relationships, which is especially useful for an org split use case to separate the data model among multiple apps.

# spinner.message

Generating data dictionary...

# error.review.message

Please review the object list, exclude potential not supported standard objects for api version %s and try again.

# error.noUserFound

User %s not found.

# error.objectNotSupported

SObject: %s is not supported, please use --exclude-objects flag (comma separated) skip it

# flags.name.summary

Description of a flag.

# flags.name.description

More information about a flag. Don't repeat the summary.

# examples

- <%= config.bin %> <%= command.id %>

# flags.include-all-managed.summary

Specifies whether to include all managed package components. Default value is false.

# flags.api-version.summary

undefined

# flags.target-org.summary

undefined

# flags.exclude-managed-prefixes.summary

Specifies certain managed package prefixes (comma-separated) to exclude from the operation. This flag overrides the --include-all-managed flag, removing the specified packages from the managed components being included. Default value is null.

# flags.include-managed-prefixes.summary

Specifies specific managed package prefixes (comma-separated) to include in the operation. This flag overrides the --include-all-managed flag, ensuring only the specified managed packages are included. Default value is null.

# flags.sobjects.summary

Specifies particular Salesforce objects (comma-separated) to include in the operation. This flag overrides the --include-all-managed flag if used.

# flags.dir.summary

Directory for saving outputs.

# flags.start-object.summary

Specifies the sObject to begin crawling through its relationships.

# flags.output-time.summary

Controls the format of the appended timestamp in the output folder name. If set to true, both date and time are appended; if false, only the date is appended.

# flags.skip-charts.summary

Determines whether ERD charts are generated. If set to true, ERD charts and Lucidchart import files are not generated.

# flags.include-std-objects.summary

Specifies a comma-separated list of standard objects to include in the crawl. By default, standard objects are not crawled, but this flag makes exceptions for the specified objects to explore their relationships.

# flags.verbose.summary

Displays object lists and more details in the output.

# flags.skip-empty-objects.summary

Ensures that only objects with a record count greater than 0 are included. Default value is false, allowing all objects to be included regardless of their record count.

# flags.exclude-objects.summary

Specifies the objects to exclude.

# flags.username.summary

Specifies a username to retrieve all objects that a given user can read from profile and permission set assignments.
