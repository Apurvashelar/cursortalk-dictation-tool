# Customer Infra Ops

This folder gives you two ways to run the customer AWS setup flow:

1. one full wrapper
2. four separate step wrappers

Before running either path, copy and fill the customer config file:

```bash
cp customers/customer-config.example.json customers/customer-config.json
```

Edit `customers/customer-config.json` with the customer AWS and deployment details, then run the scripts below.

## Full wrapper

```bash
bash customer-infra-ops/run-full-setup.sh customers/customer-config.json
```

This runs:

1. deploy
2. validate
3. seed demo org
4. smoke test

## Separate step wrappers

```bash
bash customer-infra-ops/deploy-customer.sh customers/customer-config.json
bash customer-infra-ops/validate-customer.sh customers/customer-config.json
bash customer-infra-ops/seed-demo-org.sh customers/customer-config.json
bash customer-infra-ops/smoke-test.sh customers/customer-config.json
```

## Safe test mode

To see the full wrapper sequence without actually calling AWS:

```bash
bash customer-infra-ops/run-full-setup.sh customers/customer-config.json --dry-run
```
