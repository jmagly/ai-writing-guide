path "kv_internal/data/ci/aiwg/*" {
  capabilities = ["read"]
}

path "kv_internal/metadata/ci/aiwg/*" {
  capabilities = ["read", "list"]
}

path "kv_internal/data/ci/shared/docs-deploy" {
  capabilities = ["read"]
}

path "kv_internal/metadata/ci/shared/docs-deploy" {
  capabilities = ["read"]
}
