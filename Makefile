.PHONY: dagger-pipeline
dagger-pipeline:
	dagger call pipeline --source ./dps-webapp

.PHONY: dagger-migration
dagger-migration:
	@test -n "$(name)" || (echo "Usage: make dagger-migration name=<migration_name>" && exit 1)
	dagger call migration-dev --source ./dps-webapp --migration-name $(name)
