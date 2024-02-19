# PBSHM IE Visualiser
The PBSHM IE Visualiser is designed to help users design and visualise IE models for use within the [PBSHM Core](https://github.com/dynamics-research-group/pbshm-flask-core). The visualiser enables IE models to be created in the online 3D model builder and then saved as [PBSHM Schema](https://github.com/dynamics-research-group/pbshm-schema) compliant JSON files in the database. Existing IE models within the database can either be viewed in a read-only online 3D tool or edited in the 3D model builder.

For more information about the syntax of an IE model, please read the documentation for the [PBSHM Schema](https://github.com/dynamics-research-group/pbshm-schema).

## Installation
Install the package via pip:
```
pip install pbshm-ie-visualiser
```

## Setup
Firstly, configure the PBSHM Core by following the [outlined guide](https://github.com/dynamics-research-group/pbshm-flask-core#setup)

## Running
The application is run via the standard Flask command:
```
flask run
```