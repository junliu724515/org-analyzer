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

# error.wrongProfile

Please avoid using user %s with System Administrator profile

# flags.name.summary

Description of a flag.

# flags.name.description

More information about a flag. Don't repeat the summary.

# examples

- <%= config.bin %> <%= command.id %>

# flags.include-all-managed.summary

The -m, --include-all-managed flag, with a default value of false, It specifies whether to include all managed package components.

# flags.api-version.summary

undefined

# flags.target-org.summary

undefined

# flags.exclude-managed-prefixes.summary

The -x, --exclude-managed-prefixes flag, with a default value of null, allows you to specify certain managed package prefixes (comma separated) to exclude from the operation. When used, it overrides the --include-all-managed flag by removing the specified packages from the managed components being included.

# flags.include-managed-prefixes.summary

The -l, --include-managed-prefixes flag, with a default value of null, allows you to specify specific managed package prefixes (comma separated) to include in the operation. When this flag is used, it overrides the --include-all-managed flag, ensuring that only the specified managed packages are included.

# flags.sobjects.summary

The -s, --sobjects flag allows you to specify particular Salesforce objects (comma separated) to include in the operation, overriding the --include-all-managed flag if use.

# flags.dir.summary

Directory for saving outputs.

# flags.start-object.summary

Specifies the sObject to begin crawling through its relationships.

# flags.output-time.summary

Flag controls the format of the appended timestamp in the output folder name. If set to true, both date and time are appended; if false, only the date is appended.

# flags.skip-charts.summary

Flag determines whether ERD charts are generated. When true, an ERD chart and a text file for Lucidchart import will be not be generated.

# flags.include-std-objects.summary

Flag allows you to specify a comma-separated list of standard objects to be included in the crawl. By default, standard objects are not crawled, but this flag makes exceptions for the specified objects to further explore their relationships.

# flags.verbose.summary

It displays object list and more details in output.

# flags.include-non-empty-objects.summary

When set to true, ensures that only objects with a record count greater than 0 are included. By default, it is false, allowing all objects to be included regardless of their record count.

# flags.exclude-objects.summary

The Flag to specify the objects to exclude.

# flags.app-api-name.summary

It specifies the app from which all objects will be extracted.

# flags.username.summary

It specifies a username to get all objects that a given user can read from profile and permission set assignments.
