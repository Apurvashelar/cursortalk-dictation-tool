#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${INFRA_DIR}/.." && pwd)"

usage() {
  cat <<'EOF'
Usage:
  bash infra/scripts/package-client-bundle.sh [output-dir]

What it does:
  1. builds the compiled infrastructure app
  2. creates a minimal customer-facing bundle
  3. copies only the files needed for deploy, validate, and seed

Default output directory:
  dist/client-bundle-v<infra-package-version>
EOF
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

DEFAULT_OUTPUT_DIR=""

if [[ "${1:-}" = "-h" || "${1:-}" = "--help" ]]; then
  usage
  exit 0
fi

require_cmd npm
require_cmd node

cd "${INFRA_DIR}"

PACKAGE_VERSION="$(node -p "require('./package.json').version")"
DEFAULT_OUTPUT_DIR="${REPO_ROOT}/dist/client-bundle-v${PACKAGE_VERSION}"
OUTPUT_DIR="${1:-${DEFAULT_OUTPUT_DIR}}"

if [[ "${OUTPUT_DIR}" != /* ]]; then
  OUTPUT_DIR="${REPO_ROOT}/${OUTPUT_DIR}"
fi

if [[ ! -d node_modules ]]; then
  npm install
fi

npm run build

rm -rf "${OUTPUT_DIR}"
mkdir -p "${OUTPUT_DIR}/infra/scripts"
mkdir -p "${OUTPUT_DIR}/infra/config"
mkdir -p "${OUTPUT_DIR}/infra/dist"
mkdir -p "${OUTPUT_DIR}/customers"
mkdir -p "${OUTPUT_DIR}/customer-infra-ops"
mkdir -p "${OUTPUT_DIR}/docs/Infrastructure Setup"

cp "${INFRA_DIR}/package.json" "${OUTPUT_DIR}/infra/package.json"
cp "${INFRA_DIR}/package-lock.json" "${OUTPUT_DIR}/infra/package-lock.json"
cp "${INFRA_DIR}/cdk.json" "${OUTPUT_DIR}/infra/cdk.json"
cp "${INFRA_DIR}/config/customer-config.schema.json" "${OUTPUT_DIR}/infra/config/customer-config.schema.json"

cp "${INFRA_DIR}/scripts/deploy.sh" "${OUTPUT_DIR}/infra/scripts/deploy.sh"
cp "${INFRA_DIR}/scripts/validate.sh" "${OUTPUT_DIR}/infra/scripts/validate.sh"
cp "${INFRA_DIR}/scripts/validate-existing-vpc.js" "${OUTPUT_DIR}/infra/scripts/validate-existing-vpc.js"
cp "${INFRA_DIR}/scripts/validate-existing-alb.js" "${OUTPUT_DIR}/infra/scripts/validate-existing-alb.js"
cp "${INFRA_DIR}/scripts/validate-existing-certificate.js" "${OUTPUT_DIR}/infra/scripts/validate-existing-certificate.js"
cp "${INFRA_DIR}/scripts/validate-existing-database.js" "${OUTPUT_DIR}/infra/scripts/validate-existing-database.js"
cp "${INFRA_DIR}/scripts/seed-demo-org.sh" "${OUTPUT_DIR}/infra/scripts/seed-demo-org.sh"
cp "${INFRA_DIR}/scripts/smoke-test.sh" "${OUTPUT_DIR}/infra/scripts/smoke-test.sh"

cp -R "${INFRA_DIR}/dist/." "${OUTPUT_DIR}/infra/dist/"

cp "${REPO_ROOT}/customers/customer-config.example.json" "${OUTPUT_DIR}/customers/customer-config.example.json"
cp "${INFRA_DIR}/client-bundle/README.md" "${OUTPUT_DIR}/README.md"
cp "${REPO_ROOT}/customer-infra-ops/README.md" "${OUTPUT_DIR}/customer-infra-ops/README.md"
cp "${REPO_ROOT}/customer-infra-ops/run-full-setup.sh" "${OUTPUT_DIR}/customer-infra-ops/run-full-setup.sh"
cp "${REPO_ROOT}/customer-infra-ops/deploy-customer.sh" "${OUTPUT_DIR}/customer-infra-ops/deploy-customer.sh"
cp "${REPO_ROOT}/customer-infra-ops/validate-customer.sh" "${OUTPUT_DIR}/customer-infra-ops/validate-customer.sh"
cp "${REPO_ROOT}/customer-infra-ops/seed-demo-org.sh" "${OUTPUT_DIR}/customer-infra-ops/seed-demo-org.sh"
cp "${REPO_ROOT}/customer-infra-ops/smoke-test.sh" "${OUTPUT_DIR}/customer-infra-ops/smoke-test.sh"

cp "${REPO_ROOT}/cursortalk-app/docs/Infrastructure Setup/README.md" "${OUTPUT_DIR}/docs/Infrastructure Setup/README.md"
cp "${REPO_ROOT}/cursortalk-app/docs/Infrastructure Setup/cursortalk-customer-setup-runbook-v1.md" "${OUTPUT_DIR}/docs/Infrastructure Setup/cursortalk-customer-setup-runbook-v1.md"
cp "${REPO_ROOT}/cursortalk-app/docs/Infrastructure Setup/cursortalk-customer-infra-guide-v1.md" "${OUTPUT_DIR}/docs/Infrastructure Setup/cursortalk-customer-infra-guide-v1.md"
cp "${REPO_ROOT}/cursortalk-app/docs/Infrastructure Setup/cursortalk-customer-quickstart-v1.md" "${OUTPUT_DIR}/docs/Infrastructure Setup/cursortalk-customer-quickstart-v1.md"
cp "${REPO_ROOT}/cursortalk-app/docs/Infrastructure Setup/cursortalk-customer-prerequisites-v1.md" "${OUTPUT_DIR}/docs/Infrastructure Setup/cursortalk-customer-prerequisites-v1.md"
cp "${REPO_ROOT}/cursortalk-app/docs/Infrastructure Setup/cursortalk-customer-config-schema.md" "${OUTPUT_DIR}/docs/Infrastructure Setup/cursortalk-customer-config-schema.md"

chmod +x "${OUTPUT_DIR}/infra/scripts/deploy.sh"
chmod +x "${OUTPUT_DIR}/infra/scripts/validate.sh"
chmod +x "${OUTPUT_DIR}/infra/scripts/validate-existing-vpc.js"
chmod +x "${OUTPUT_DIR}/infra/scripts/validate-existing-alb.js"
chmod +x "${OUTPUT_DIR}/infra/scripts/validate-existing-certificate.js"
chmod +x "${OUTPUT_DIR}/infra/scripts/validate-existing-database.js"
chmod +x "${OUTPUT_DIR}/infra/scripts/seed-demo-org.sh"
chmod +x "${OUTPUT_DIR}/infra/scripts/smoke-test.sh"
chmod +x "${OUTPUT_DIR}/customer-infra-ops/run-full-setup.sh"
chmod +x "${OUTPUT_DIR}/customer-infra-ops/deploy-customer.sh"
chmod +x "${OUTPUT_DIR}/customer-infra-ops/validate-customer.sh"
chmod +x "${OUTPUT_DIR}/customer-infra-ops/seed-demo-org.sh"
chmod +x "${OUTPUT_DIR}/customer-infra-ops/smoke-test.sh"

node -e '
  const fs = require("node:fs");
  const path = process.argv[1];
  const version = process.argv[2];
  const payload = {
    bundleFormatVersion: 1,
    bundleName: `cursortalk-client-bundle-v${version}`,
    bundleVersion: version,
    infraVersion: version,
    recommendedArchiveName: `cursortalk-client-bundle-v${version}.tar.gz`,
    generatedAtUtc: new Date().toISOString(),
    includedScripts: [
      "infra/scripts/deploy.sh",
      "infra/scripts/validate.sh",
      "infra/scripts/validate-existing-vpc.js",
      "infra/scripts/validate-existing-alb.js",
      "infra/scripts/validate-existing-certificate.js",
      "infra/scripts/validate-existing-database.js",
      "infra/scripts/seed-demo-org.sh",
      "infra/scripts/smoke-test.sh",
      "customer-infra-ops/run-full-setup.sh",
      "customer-infra-ops/deploy-customer.sh",
      "customer-infra-ops/validate-customer.sh",
      "customer-infra-ops/seed-demo-org.sh",
      "customer-infra-ops/smoke-test.sh"
    ]
  };
  fs.writeFileSync(path, JSON.stringify(payload, null, 2) + "\n");
' "${OUTPUT_DIR}/bundle-manifest.json" "${PACKAGE_VERSION}"

ARCHIVE_PATH="${REPO_ROOT}/dist/cursortalk-client-bundle-v${PACKAGE_VERSION}.tar.gz"
rm -f "${ARCHIVE_PATH}"
tar -C "${REPO_ROOT}/dist" -czf "${ARCHIVE_PATH}" "$(basename "${OUTPUT_DIR}")"

echo "Client bundle generated at:"
echo "  ${OUTPUT_DIR}"
echo "Archive generated at:"
echo "  ${ARCHIVE_PATH}"
echo
echo "Included:"
echo "  - compiled infra app"
echo "  - raw infra scripts"
echo "  - customer wrapper scripts"
echo "  - customer config example"
echo "  - customer config schema"
echo "  - customer-facing setup docs"
