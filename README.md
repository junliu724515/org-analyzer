# org-analyzer

[![NPM](https://img.shields.io/npm/v/org-analyzer.svg?label=org-analyzer)](https://www.npmjs.com/package/org-analyzer) [![Downloads/week](https://img.shields.io/npm/dw/org-analyzer.svg)](https://npmjs.org/package/org-analyzer) [![License](https://img.shields.io/badge/License-BSD%203--Clause-brightgreen.svg)](https://raw.githubusercontent.com/salesforcecli/org-analyzer/main/LICENSE.txt)

## Description

Org-analyzer is a Salesforce CLI plugin designed to analyze and generate comprehensive data dictionaries for Salesforce orgs. By default, it extracts all custom objects and standard objects with custom fields. It offers the ability to filter objects based on user access through profiles and permission sets, as well as the capability to crawl object relationships. Additionally, the plugin generates Excel-based data dictionaries and creates Entity Relationship Diagram (ERD) charts.

## Features

- Analyzes and generates comprehensive data dictionaries for Salesforce orgs
- Extracts all custom objects and standard objects with custom fields by default
- Filters objects based on user access through profiles and permission sets
- Crawls object relationships for detailed insights
- Generates Excel-based data dictionaries for easy reference
- Creates visual Entity Relationship Diagram (ERD) charts

## Install

```bash
sf plugins install org-analyzer@x.y.z
```

### Build

To build the plugin locally, make sure to have yarn installed and run the following commands:

```bash
# Clone the repository
git clone https://github.com/junliu724515/org-analyzer.git

# Install the dependencies and compile
yarn && yarn build
```

To use your plugin, run using the local `./bin/dev` or `./bin/dev.cmd` file.

```bash
# Run using local run file.
./bin/dev data-dictionary generate
```

There should be no differences when running via the Salesforce CLI or using the local run file. However, it can be useful to link the plugin to do some additional testing or run your commands from anywhere on your machine.

```bash
# Link your plugin to the sf cli
sf plugins link .
# To verify
sf plugins
```

## Commands

<!-- commands -->
* [`sf data-dictionary generate`](#sf-data-dictionary-generate)

## `sf data-dictionary generate`

The data-dictionary feature enables automatic extraction and documentation of metadata from a Salesforce org, offering a detailed overview of objects, fields, and their attributes, including data types, relationships, and descriptions.

```
USAGE
  $ sf data-dictionary generate [--json] [--flags-dir <value>] [-m] [--api-version <value>] [-o <value>] [-x <value>] [-l
    <value>] [-s <value>] [-d <value>] [--start-object <value>] [--output-time] [--skip-charts] [--include-std-objects
    <value>] [--verbose] [--skip-empty-objects] [--exclude-objects <value>] [--username <value>] [--process-batch-size
    <value>]

FLAGS
  -d, --dir=<value>                       Directory for saving outputs.
  -l, --include-managed-prefixes=<value>  Specifies specific managed package prefixes (comma-separated) to include in
                                          the operation. This flag overrides the --include-all-managed flag, ensuring
                                          only the specified managed packages are included. Default value is null.
  -m, --include-all-managed               Specifies whether to include all managed package components. Default value is
                                          false.
  -o, --target-org=<value>                Username or alias of the target org.
  -s, --sobjects=<value>                  Specifies particular Salesforce objects (comma-separated) to include in the
                                          operation. This flag overrides the --include-all-managed flag if used.
  -x, --exclude-managed-prefixes=<value>  Specifies certain managed package prefixes (comma-separated) to exclude from
                                          the operation. This flag overrides the --include-all-managed flag, removing
                                          the specified packages from the managed components being included. Default
                                          value is null.
      --api-version=<value>               Override the api version used for api requests made by this command
      --exclude-objects=<value>           Specifies the objects to exclude.
      --include-std-objects=<value>       Specifies a comma-separated list of standard objects to include in the crawl.
                                          By default, standard objects are not crawled, but this flag makes exceptions
                                          for the specified objects to explore their relationships.
      --output-time                       Controls the format of the appended timestamp in the output folder name. If
                                          set to true, both date and time are appended; if false, only the date is
                                          appended.
      --process-batch-size=<value>        [default: 100] Specifies the batch size to process SObjects. Default is 100.
      --skip-charts                       Determines whether ERD charts are generated. If set to true, ERD charts and
                                          Lucidchart import files are not generated.
      --skip-empty-objects                Ensures that only objects with a record count greater than 0 are included.
                                          Default value is false, allowing all objects to be included regardless of
                                          their record count.
      --start-object=<value>              Specifies the sObject to begin crawling through its relationships.
      --username=<value>                  Specifies a username to retrieve all objects that a given user can read from
                                          profile and permission set assignments.
      --verbose                           Displays object lists and more details in the output.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  The data-dictionary feature enables automatic extraction and documentation of metadata from a Salesforce org, offering
  a detailed overview of objects, fields, and their attributes, including data types, relationships, and descriptions.

  By default, it will list all custom objects and all standard objects with at least one custom field. Additionally, you
  can choose to include or exclude any managed package objects. Above all, a very unique feature is the ability to crawl
  objects through their relationships, which is especially useful for an org split use case to separate the data model
  among multiple apps.

EXAMPLES
  $ sf data-dictionary generate
```
<!-- commandsstop -->
