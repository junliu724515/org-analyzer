# summary

The data-dictionary feature enables automatic extraction and documentation of metadata from a Salesforce org, offering a detailed overview of objects, fields, and their attributes, including data types, relationships, and descriptions.

# description

More information about a command. Don't repeat the summary.

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
