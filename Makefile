.PHONY: dagger-pipeline
dagger-pipeline:
	dagger call pipeline --source ./dps-webapp
