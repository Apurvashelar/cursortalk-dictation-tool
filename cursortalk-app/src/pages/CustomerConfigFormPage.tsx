import { CheckCircle2, CircleHelp, Download } from "lucide-react";
import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import { CursorTalkMark } from "../components/CursorTalkMark";

type Choice = "create" | "existing";

type SeedUser = {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
};

type FormState = {
  projectName: string;
  environment: string;
  region: string;
  adminEmail: string;
  domainName: string;
  createRoute53Record: boolean;
  hostedZoneName: string;
  hostedZoneId: string;
  vpcMode: Choice;
  existingVpcId: string;
  existingPublicSubnetIds: string;
  existingPrivateSubnetIds: string;
  albMode: Choice;
  existingAlbArn: string;
  existingAlbHttpsListenerArn: string;
  existingAlbSecurityGroupId: string;
  existingAlbDnsName: string;
  existingAlbCanonicalHostedZoneId: string;
  certificateMode: Choice;
  existingCertificateArn: string;
  databaseMode: Choice;
  dbInstanceType: string;
  existingDatabaseSecretArn: string;
  gpuInstanceType: string;
  authImageUri: string;
  cleanupImageUri: string;
  cleanupModelS3Uri: string;
  demoOrgName: string;
  ownerEmail: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerPassword: string;
  memberEmail: string;
  memberFirstName: string;
  memberLastName: string;
  memberPassword: string;
  additionalOwners: SeedUser[];
  additionalMembers: SeedUser[];
};

type FieldHelpProps = {
  label: string;
  required?: boolean;
  info: string;
  example?: string;
  error?: string | null;
  children: ReactNode;
};

const initialState: FormState = {
  projectName: "cursortalk",
  environment: "prod",
  region: "us-east-1",
  adminEmail: "admin@example.com",
  domainName: "api.example.com",
  createRoute53Record: true,
  hostedZoneName: "example.com",
  hostedZoneId: "",
  vpcMode: "create",
  existingVpcId: "",
  existingPublicSubnetIds: "",
  existingPrivateSubnetIds: "",
  albMode: "create",
  existingAlbArn: "",
  existingAlbHttpsListenerArn: "",
  existingAlbSecurityGroupId: "",
  existingAlbDnsName: "",
  existingAlbCanonicalHostedZoneId: "",
  certificateMode: "create",
  existingCertificateArn: "",
  databaseMode: "create",
  dbInstanceType: "db.t4g.micro",
  existingDatabaseSecretArn: "",
  gpuInstanceType: "g5.xlarge",
  authImageUri: "",
  cleanupImageUri: "",
  cleanupModelS3Uri: "",
  demoOrgName: "CursorTalk Demo",
  ownerEmail: "owner@example.com",
  ownerFirstName: "Demo",
  ownerLastName: "Owner",
  ownerPassword: "",
  memberEmail: "member@example.com",
  memberFirstName: "Demo",
  memberLastName: "Member",
  memberPassword: "",
  additionalOwners: [],
  additionalMembers: [],
};

function slugifyProjectName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 14);
}

function parseList(value: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildConfig(state: FormState) {
  const additionalOwners = state.additionalOwners
    .map((user) => ({
      email: user.email.trim(),
      firstName: user.firstName.trim(),
      lastName: user.lastName.trim(),
      password: user.password,
    }))
    .filter((user) => user.email || user.firstName || user.lastName || user.password);

  const additionalMembers = state.additionalMembers
    .map((user) => ({
      email: user.email.trim(),
      firstName: user.firstName.trim(),
      lastName: user.lastName.trim(),
      password: user.password,
    }))
    .filter((user) => user.email || user.firstName || user.lastName || user.password);

  const config: Record<string, unknown> = {
    projectName: slugifyProjectName(state.projectName) || state.projectName.trim(),
    environment: state.environment.trim(),
    region: state.region.trim(),
    adminEmail: state.adminEmail.trim(),
    domainName: state.domainName.trim(),
    createRoute53Record: state.createRoute53Record,
    vpcMode: state.vpcMode,
    albMode: state.albMode,
    certificateMode: state.certificateMode,
    databaseMode: state.databaseMode,
    gpuInstanceType: state.gpuInstanceType.trim(),
    authImageUri: state.authImageUri.trim(),
    cleanupImageUri: state.cleanupImageUri.trim(),
    cleanupModelS3Uri: state.cleanupModelS3Uri.trim(),
    demoSeed: {
      orgName: state.demoOrgName.trim(),
      ownerEmail: state.ownerEmail.trim(),
      ownerFirstName: state.ownerFirstName.trim(),
      ownerLastName: state.ownerLastName.trim(),
      ownerPassword: state.ownerPassword,
      memberEmail: state.memberEmail.trim(),
      memberFirstName: state.memberFirstName.trim(),
      memberLastName: state.memberLastName.trim(),
      memberPassword: state.memberPassword,
      ...(additionalOwners.length > 0 ? { additionalOwners } : {}),
      ...(additionalMembers.length > 0 ? { additionalMembers } : {}),
    },
  };

  if (state.certificateMode === "create" || state.createRoute53Record) {
    config.hostedZoneName = state.hostedZoneName.trim();
    config.hostedZoneId = state.hostedZoneId.trim();
  }

  if (state.vpcMode === "existing") {
    config.existingVpcId = state.existingVpcId.trim();
    config.existingPublicSubnetIds = parseList(state.existingPublicSubnetIds);
    config.existingPrivateSubnetIds = parseList(state.existingPrivateSubnetIds);
  }

  if (state.albMode === "existing") {
    config.existingAlbArn = state.existingAlbArn.trim();
    config.existingAlbHttpsListenerArn = state.existingAlbHttpsListenerArn.trim();
    config.existingAlbSecurityGroupId = state.existingAlbSecurityGroupId.trim();

    if (state.existingAlbDnsName.trim()) {
      config.existingAlbDnsName = state.existingAlbDnsName.trim();
    }
    if (state.existingAlbCanonicalHostedZoneId.trim()) {
      config.existingAlbCanonicalHostedZoneId = state.existingAlbCanonicalHostedZoneId.trim();
    }
  }

  if (state.certificateMode === "existing") {
    config.existingCertificateArn = state.existingCertificateArn.trim();
  }

  if (state.databaseMode === "existing") {
    config.existingDatabaseSecretArn = state.existingDatabaseSecretArn.trim();
  } else {
    config.dbInstanceType = state.dbInstanceType.trim();
  }

  return config;
}

function FieldHelp({ label, required, info, example, error, children }: FieldHelpProps) {
  return (
    <label className="cf-field">
      <div className="cf-field-header">
        <div className="cf-label-row">
          <span>{label}</span>
          {required ? <span className="cf-required">*</span> : null}
        </div>
        <details className="cf-help">
          <summary aria-label={`About ${label}`}>
            <CircleHelp size={16} strokeWidth={2} />
          </summary>
          <div className="cf-help-popover">
            <strong>Why we ask for this</strong>
            <p>{info}</p>
            {example ? (
              <div className="cf-help-example">
                <span>Example</span>
                <code>{example}</code>
              </div>
            ) : null}
          </div>
        </details>
      </div>
      {children}
      {error ? <span className="cf-field-error">{error}</span> : null}
    </label>
  );
}

function ExtraSeedUsers({
  title,
  users,
  onAdd,
  onRemove,
  onChange,
}: {
  title: string;
  users: SeedUser[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: (index: number, key: keyof SeedUser, value: string) => void;
}) {
  return (
    <div className="cf-extra-users">
      <div className="cf-extra-users-header">
        <div>
          <h4>{title}</h4>
          <p>Add more seeded users if the customer wants them created during setup.</p>
        </div>
        <button className="cf-mini-button" type="button" onClick={onAdd}>
          Add
        </button>
      </div>

      {users.map((user, index) => (
        <div className="cf-extra-user-card" key={`${title}-${index}`}>
          <div className="cf-extra-user-toolbar">
            <span>{`${title.slice(0, -1)} ${index + 1}`}</span>
            <button className="cf-mini-button cf-mini-button-danger" type="button" onClick={() => onRemove(index)}>
              Remove
            </button>
          </div>
          <div className="cf-inline-fields">
            <FieldHelp label="Email" required info="Login email for this seeded user." example="user@example.com">
              <input type="email" value={user.email} onChange={(event) => onChange(index, "email", event.target.value)} />
            </FieldHelp>
            <FieldHelp label="First name" required info="First name for this seeded user." example="Taylor">
              <input type="text" value={user.firstName} onChange={(event) => onChange(index, "firstName", event.target.value)} />
            </FieldHelp>
            <FieldHelp label="Last name" required info="Last name for this seeded user." example="Lee">
              <input type="text" value={user.lastName} onChange={(event) => onChange(index, "lastName", event.target.value)} />
            </FieldHelp>
            <FieldHelp label="Password" required info="Password used for this seeded user login." example="ReplacePassword123!">
              <input type="text" value={user.password} onChange={(event) => onChange(index, "password", event.target.value)} />
            </FieldHelp>
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionTitle({
  title,
  eyebrow,
  body,
}: {
  title: string;
  eyebrow: string;
  body: string;
}) {
  return (
    <div className="cf-section-copy">
      <p className="cf-section-eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
  );
}

export function CustomerConfigFormPage() {
  const [form, setForm] = useState<FormState>(initialState);
  const [downloaded, setDownloaded] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const generatedConfig = useMemo(() => buildConfig(form), [form]);
  const configText = useMemo(() => `${JSON.stringify(generatedConfig, null, 2)}\n`, [generatedConfig]);
  const normalizedProjectName = useMemo(() => slugifyProjectName(form.projectName), [form.projectName]);

  const needsHostedZone = form.certificateMode === "create" || form.createRoute53Record;
  const isExistingVpc = form.vpcMode === "existing";
  const isExistingAlb = form.albMode === "existing";
  const isExistingCertificate = form.certificateMode === "existing";
  const isExistingDatabase = form.databaseMode === "existing";

  const errors = useMemo(() => {
    const next: Partial<Record<keyof FormState, string>> = {};

    const requireValue = (key: keyof FormState, message = "This field is required.") => {
      if (!String(form[key] ?? "").trim()) {
        next[key] = message;
      }
    };

    requireValue("projectName");
    requireValue("environment");
    requireValue("region");
    requireValue("adminEmail");
    requireValue("domainName");
    requireValue("gpuInstanceType");
    requireValue("authImageUri");
    requireValue("cleanupImageUri");
    requireValue("cleanupModelS3Uri");
    requireValue("demoOrgName");
    requireValue("ownerEmail");
    requireValue("ownerFirstName");
    requireValue("ownerLastName");
    requireValue("ownerPassword");
    requireValue("memberEmail");
    requireValue("memberFirstName");
    requireValue("memberLastName");
    requireValue("memberPassword");

    const validateExtraUsers = (users: SeedUser[], label: string) => {
      users.forEach((user, index) => {
        if (!user.email.trim() || !user.firstName.trim() || !user.lastName.trim() || !user.password.trim()) {
          next[label as keyof FormState] = `${label} entry ${index + 1} is incomplete.`;
        }
      });
    };

    if (needsHostedZone) {
      requireValue("hostedZoneName");
      requireValue("hostedZoneId");
    }

    if (isExistingVpc) {
      requireValue("existingVpcId");
      requireValue("existingPublicSubnetIds");
      requireValue("existingPrivateSubnetIds");
    }

    if (isExistingAlb) {
      requireValue("existingAlbArn");
      requireValue("existingAlbHttpsListenerArn");
      requireValue("existingAlbSecurityGroupId");
    }

    if (isExistingCertificate) {
      requireValue("existingCertificateArn");
    }

    if (isExistingDatabase) {
      requireValue("existingDatabaseSecretArn");
    } else {
      requireValue("dbInstanceType");
    }

    validateExtraUsers(form.additionalOwners, "additionalOwners");
    validateExtraUsers(form.additionalMembers, "additionalMembers");

    return next;
  }, [form, isExistingAlb, isExistingCertificate, isExistingDatabase, isExistingVpc, needsHostedZone]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };

      if (key === "albMode" && value === "existing") {
        next.vpcMode = "existing";
        next.certificateMode = "existing";
      }

      if (key === "vpcMode" && value === "create" && current.albMode === "existing") {
        next.albMode = "create";
      }

      if (key === "certificateMode" && value === "create" && current.albMode === "existing") {
        next.albMode = "create";
      }

      return next;
    });
  }

  function addExtraUser(group: "additionalOwners" | "additionalMembers") {
    setForm((current) => ({
      ...current,
      [group]: [
        ...current[group],
        { email: "", firstName: "", lastName: "", password: "" },
      ],
    }));
  }

  function removeExtraUser(group: "additionalOwners" | "additionalMembers", index: number) {
    setForm((current) => ({
      ...current,
      [group]: current[group].filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function updateExtraUser(
    group: "additionalOwners" | "additionalMembers",
    index: number,
    key: keyof SeedUser,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [group]: current[group].map((user, itemIndex) =>
        itemIndex === index ? { ...user, [key]: value } : user,
      ),
    }));
  }

  function downloadConfig() {
    const blob = new Blob([configText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${normalizedProjectName || "customer"}-config.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    window.setTimeout(() => setDownloaded(false), 2200);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

    if (Object.keys(errors).length > 0) {
      return;
    }

    downloadConfig();
  }

  return (
    <div className="cf-page mk-theme">
      <header className="cf-topbar">
        <div className="mk-shell cf-topbar-inner">
          <div className="cf-brand">
            <span className="cf-brand-mark">
              <CursorTalkMark className="h-5 w-5" />
            </span>
            <div>
              <span className="cf-brand-title">CursorTalk Customer Setup Form</span>
              <p>Fill the required details and submit to generate the deployment config.</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mk-shell cf-main">
        <form className="cf-layout" onSubmit={handleSubmit}>
          <div className="cf-form-stack cf-form-stack-single">
            <section className="cf-card">
              <SectionTitle
                eyebrow="Deployment profile"
                title="Core deployment identity"
                body="These fields define the project slug, region, admin contact, and public domain that the customer deployment will use."
              />
              <div className="cf-grid cf-grid-2">
                <FieldHelp
                  label="Project name"
                  required
                  error={submitted ? errors.projectName ?? null : null}
                  info="This becomes the infrastructure naming prefix in AWS. Keep it short, lowercase, and slug-like so load balancer and target group names stay within AWS length limits."
                  example="cursortalkent"
                >
                  <input
                    type="text"
                    value={form.projectName}
                    onChange={(event) => updateField("projectName", event.target.value)}
                    aria-invalid={submitted && !!errors.projectName}
                  />
                  <small className="cf-inline-note">
                    Safe slug preview: <code>{normalizedProjectName || "project-name"}</code>
                  </small>
                </FieldHelp>

                <FieldHelp
                  label="Environment"
                  required
                  error={submitted ? errors.environment ?? null : null}
                  info="Use a short environment label such as prod, staging, or preview. It becomes part of the stack names."
                  example="prod"
                >
                  <input
                    type="text"
                    value={form.environment}
                    onChange={(event) => updateField("environment", event.target.value)}
                    aria-invalid={submitted && !!errors.environment}
                  />
                </FieldHelp>

                <FieldHelp
                  label="AWS region"
                  required
                  error={submitted ? errors.region ?? null : null}
                  info="This is the AWS region where the infrastructure will be deployed. The current tested flow is based on us-east-1."
                  example="us-east-1"
                >
                  <input
                    type="text"
                    value={form.region}
                    onChange={(event) => updateField("region", event.target.value)}
                    aria-invalid={submitted && !!errors.region}
                  />
                </FieldHelp>

                <FieldHelp
                  label="Admin email"
                  required
                  error={submitted ? errors.adminEmail ?? null : null}
                  info="Primary operator contact for the deployment. Use the enterprise admin address that should own the environment."
                  example="admin@company.com"
                >
                  <input
                    type="email"
                    value={form.adminEmail}
                    onChange={(event) => updateField("adminEmail", event.target.value)}
                    aria-invalid={submitted && !!errors.adminEmail}
                  />
                </FieldHelp>

                <FieldHelp
                  label="Public domain"
                  required
                  error={submitted ? errors.domainName ?? null : null}
                  info="The public API hostname that the customer desktop app and operators will use to reach the deployed backend."
                  example="api.example.com"
                >
                  <input
                    type="text"
                    value={form.domainName}
                    onChange={(event) => updateField("domainName", event.target.value)}
                    aria-invalid={submitted && !!errors.domainName}
                  />
                </FieldHelp>

                <FieldHelp
                  label="Create Route 53 record"
                  info="Turn this on if the deployment should create or manage the DNS record for the public API domain in the specified hosted zone."
                  example="Enabled for api.example.com"
                >
                  <select
                    value={form.createRoute53Record ? "true" : "false"}
                    onChange={(event) =>
                      updateField("createRoute53Record", event.target.value === "true")
                    }
                  >
                    <option value="true">Yes, manage the DNS record</option>
                    <option value="false">No, DNS will be managed separately</option>
                  </select>
                  {needsHostedZone ? (
                    <div className="cf-inline-fields">
                      <FieldHelp
                        label="Hosted zone name"
                        required
                        error={submitted ? errors.hostedZoneName ?? null : null}
                        info="This is the Route 53 hosted zone that contains the customer domain."
                        example="example.com"
                      >
                        <input
                          type="text"
                          value={form.hostedZoneName}
                          onChange={(event) => updateField("hostedZoneName", event.target.value)}
                          aria-invalid={submitted && !!errors.hostedZoneName}
                        />
                      </FieldHelp>
                      <FieldHelp
                        label="Hosted zone ID"
                        required
                        error={submitted ? errors.hostedZoneId ?? null : null}
                        info="The Route 53 hosted zone identifier used to write or validate DNS records."
                        example="Z0332520WV6KAWTHM8Y1"
                      >
                        <input
                          type="text"
                          value={form.hostedZoneId}
                          onChange={(event) => updateField("hostedZoneId", event.target.value)}
                          aria-invalid={submitted && !!errors.hostedZoneId}
                        />
                      </FieldHelp>
                    </div>
                  ) : null}
                </FieldHelp>
              </div>
            </section>

            <section className="cf-card">
              <SectionTitle
                eyebrow="Infrastructure choices"
                title="Choose what gets created and what gets reused"
                body="These options control the conditional fields below. As you switch between create and existing modes, the form reveals only the AWS values needed for that path."
              />

              <div className="cf-grid cf-grid-2">
                <FieldHelp
                  label="VPC mode"
                  required
                  info="Choose create to let CursorTalk provision a new VPC, or existing if the customer wants to reuse an existing network."
                  example="create"
                >
                  <select
                    value={form.vpcMode}
                    onChange={(event) => updateField("vpcMode", event.target.value as Choice)}
                  >
                    <option value="create">Create a new VPC</option>
                    <option value="existing">Use an existing VPC</option>
                  </select>
                  {isExistingVpc ? (
                    <div className="cf-inline-fields">
                      <FieldHelp
                        label="Existing VPC ID"
                        required
                        error={submitted ? errors.existingVpcId ?? null : null}
                        info="The AWS VPC identifier that CursorTalk should reuse."
                        example="vpc-0123456789abcdef0"
                      >
                        <input
                          type="text"
                          value={form.existingVpcId}
                          onChange={(event) => updateField("existingVpcId", event.target.value)}
                          aria-invalid={submitted && !!errors.existingVpcId}
                        />
                      </FieldHelp>
                      <FieldHelp
                        label="Existing public subnet IDs"
                        required
                        error={submitted ? errors.existingPublicSubnetIds ?? null : null}
                        info="Public subnets for the load balancer. Use commas or one subnet per line."
                        example={"subnet-aaa111\nsubnet-bbb222"}
                      >
                        <textarea
                          value={form.existingPublicSubnetIds}
                          onChange={(event) =>
                            updateField("existingPublicSubnetIds", event.target.value)
                          }
                          aria-invalid={submitted && !!errors.existingPublicSubnetIds}
                        />
                      </FieldHelp>
                      <FieldHelp
                        label="Existing private subnet IDs"
                        required
                        error={submitted ? errors.existingPrivateSubnetIds ?? null : null}
                        info="Private subnets for services and data resources."
                        example={"subnet-ccc333\nsubnet-ddd444"}
                      >
                        <textarea
                          value={form.existingPrivateSubnetIds}
                          onChange={(event) =>
                            updateField("existingPrivateSubnetIds", event.target.value)
                          }
                          aria-invalid={submitted && !!errors.existingPrivateSubnetIds}
                        />
                      </FieldHelp>
                    </div>
                  ) : null}
                </FieldHelp>

                <FieldHelp
                  label="ALB mode"
                  required
                  info="Choose create to provision a new public load balancer, or existing to reuse one that already exists in the customer VPC."
                  example="create"
                >
                  <select
                    value={form.albMode}
                    onChange={(event) => updateField("albMode", event.target.value as Choice)}
                  >
                    <option value="create">Create a new ALB</option>
                    <option value="existing">Use an existing ALB</option>
                  </select>
                  {isExistingAlb ? (
                    <div className="cf-inline-fields">
                      <FieldHelp
                        label="Existing ALB ARN"
                        required
                        error={submitted ? errors.existingAlbArn ?? null : null}
                        info="The application load balancer ARN that the deployment should reuse."
                        example="arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/example/1234567890abcdef"
                      >
                        <input
                          type="text"
                          value={form.existingAlbArn}
                          onChange={(event) => updateField("existingAlbArn", event.target.value)}
                          aria-invalid={submitted && !!errors.existingAlbArn}
                        />
                      </FieldHelp>
                      <FieldHelp
                        label="Existing HTTPS listener ARN"
                        required
                        error={submitted ? errors.existingAlbHttpsListenerArn ?? null : null}
                        info="The HTTPS listener ARN on the existing ALB."
                        example="arn:aws:elasticloadbalancing:us-east-1:123456789012:listener/app/example/123/listener456"
                      >
                        <input
                          type="text"
                          value={form.existingAlbHttpsListenerArn}
                          onChange={(event) =>
                            updateField("existingAlbHttpsListenerArn", event.target.value)
                          }
                          aria-invalid={submitted && !!errors.existingAlbHttpsListenerArn}
                        />
                      </FieldHelp>
                      <FieldHelp
                        label="Existing ALB security group ID"
                        required
                        error={submitted ? errors.existingAlbSecurityGroupId ?? null : null}
                        info="Security group attached to the existing ALB."
                        example="sg-0123456789abcdef0"
                      >
                        <input
                          type="text"
                          value={form.existingAlbSecurityGroupId}
                          onChange={(event) =>
                            updateField("existingAlbSecurityGroupId", event.target.value)
                          }
                          aria-invalid={submitted && !!errors.existingAlbSecurityGroupId}
                        />
                      </FieldHelp>
                      <FieldHelp
                        label="Existing ALB DNS name"
                        info="Optional extra validation field."
                        example="internal-example-123.us-east-1.elb.amazonaws.com"
                      >
                        <input
                          type="text"
                          value={form.existingAlbDnsName}
                          onChange={(event) => updateField("existingAlbDnsName", event.target.value)}
                        />
                      </FieldHelp>
                      <FieldHelp
                        label="Existing ALB canonical hosted zone ID"
                        info="Optional Route 53 alias verification field."
                        example="Z35SXDOTRQ7X7K"
                      >
                        <input
                          type="text"
                          value={form.existingAlbCanonicalHostedZoneId}
                          onChange={(event) =>
                            updateField("existingAlbCanonicalHostedZoneId", event.target.value)
                          }
                        />
                      </FieldHelp>
                    </div>
                  ) : null}
                </FieldHelp>

                <FieldHelp
                  label="Certificate mode"
                  required
                  info="Choose create to provision an ACM certificate in the deployment region, or existing to reuse a certificate ARN that is already issued."
                  example="create"
                >
                  <select
                    value={form.certificateMode}
                    onChange={(event) =>
                      updateField("certificateMode", event.target.value as Choice)
                    }
                  >
                    <option value="create">Create a new certificate</option>
                    <option value="existing">Use an existing certificate</option>
                  </select>
                  {isExistingCertificate ? (
                    <div className="cf-inline-fields">
                      <FieldHelp
                        label="Existing certificate ARN"
                        required
                        error={submitted ? errors.existingCertificateArn ?? null : null}
                        info="The ACM certificate ARN that already covers the public domain."
                        example="arn:aws:acm:us-east-1:123456789012:certificate/abcd1234-5678-90ef-ghij-klmnopqrstuv"
                      >
                        <input
                          type="text"
                          value={form.existingCertificateArn}
                          onChange={(event) =>
                            updateField("existingCertificateArn", event.target.value)
                          }
                          aria-invalid={submitted && !!errors.existingCertificateArn}
                        />
                      </FieldHelp>
                    </div>
                  ) : null}
                </FieldHelp>

                <FieldHelp
                  label="Database mode"
                  required
                  info="Choose create to provision a new database, or existing to reuse a Secrets Manager entry that already contains the customer database URL."
                  example="create"
                >
                  <select
                    value={form.databaseMode}
                    onChange={(event) => updateField("databaseMode", event.target.value as Choice)}
                  >
                    <option value="create">Create a new database</option>
                    <option value="existing">Use an existing database secret</option>
                  </select>
                  {isExistingDatabase ? (
                    <div className="cf-inline-fields">
                      <FieldHelp
                        label="Existing database secret ARN"
                        required
                        error={submitted ? errors.existingDatabaseSecretArn ?? null : null}
                        info="Secrets Manager ARN that holds the PostgreSQL connection string or DATABASE_URL."
                        example="arn:aws:secretsmanager:us-east-1:123456789012:secret:customer-db-secret"
                      >
                        <input
                          type="text"
                          value={form.existingDatabaseSecretArn}
                          onChange={(event) =>
                            updateField("existingDatabaseSecretArn", event.target.value)
                          }
                          aria-invalid={submitted && !!errors.existingDatabaseSecretArn}
                        />
                      </FieldHelp>
                    </div>
                  ) : (
                    <div className="cf-inline-fields">
                      <FieldHelp
                        label="DB instance type"
                        required
                        error={submitted ? errors.dbInstanceType ?? null : null}
                        info="The RDS instance size used when the deployment creates a new database."
                        example="db.t4g.micro"
                      >
                        <input
                          type="text"
                          value={form.dbInstanceType}
                          onChange={(event) => updateField("dbInstanceType", event.target.value)}
                          aria-invalid={submitted && !!errors.dbInstanceType}
                        />
                      </FieldHelp>
                    </div>
                  )}
                </FieldHelp>
              </div>
            </section>

            <section className="cf-card">
              <SectionTitle
                eyebrow="Runtime"
                title="GPU runtime values"
                body="These values control the cleanup runtime."
              />
              <div className="cf-grid cf-grid-2">
                <FieldHelp
                  label="GPU instance type"
                  required
                  error={submitted ? errors.gpuInstanceType ?? null : null}
                  info="The EC2 GPU instance used for the cleanup runtime. The current validated default is g5.xlarge."
                  example="g5.xlarge"
                >
                  <input
                    type="text"
                    value={form.gpuInstanceType}
                    onChange={(event) => updateField("gpuInstanceType", event.target.value)}
                    aria-invalid={submitted && !!errors.gpuInstanceType}
                  />
                </FieldHelp>
              </div>
            </section>

            <section className="cf-card">
              <SectionTitle
                eyebrow="Provider-supplied artifacts"
                title="Runtime image and model locations"
                body="These fields are normally completed by the CursorTalk deployment team after runtime artifacts are published into the customer AWS account."
              />
              <div className="cf-grid">
                <FieldHelp
                  label="Auth image URI"
                  required
                  error={submitted ? errors.authImageUri ?? null : null}
                  info="ECR image URI for the auth service image. The provider supplies this after pushing the auth container into the customer AWS account."
                  example="123456789012.dkr.ecr.us-east-1.amazonaws.com/cursortalk-auth:git-abcdef12"
                >
                  <input
                    type="text"
                    value={form.authImageUri}
                    onChange={(event) => updateField("authImageUri", event.target.value)}
                    aria-invalid={submitted && !!errors.authImageUri}
                  />
                </FieldHelp>

                <FieldHelp
                  label="Cleanup image URI"
                  required
                  error={submitted ? errors.cleanupImageUri ?? null : null}
                  info="ECR image URI for the cleanup API container. The provider fills this after publishing the image into the customer AWS account."
                  example="123456789012.dkr.ecr.us-east-1.amazonaws.com/cursortalk-cleanup-api:git-abcdef12"
                >
                  <input
                    type="text"
                    value={form.cleanupImageUri}
                    onChange={(event) => updateField("cleanupImageUri", event.target.value)}
                    aria-invalid={submitted && !!errors.cleanupImageUri}
                  />
                </FieldHelp>

                <FieldHelp
                  label="Cleanup model S3 URI"
                  required
                  error={submitted ? errors.cleanupModelS3Uri ?? null : null}
                  info="S3 location of the cleanup model files that the GPU runtime should sync onto the instance at boot."
                  example="s3://customer-artifacts/models/cursortalk/"
                >
                  <input
                    type="text"
                    value={form.cleanupModelS3Uri}
                    onChange={(event) => updateField("cleanupModelS3Uri", event.target.value)}
                    aria-invalid={submitted && !!errors.cleanupModelS3Uri}
                  />
                </FieldHelp>
              </div>
            </section>

            <section className="cf-card">
              <SectionTitle
                eyebrow="Demo users"
                title="Seeded organization credentials"
                body="These values are used by the seed step to create the initial demo organization, owner account, and member account."
              />

              <div className="cf-grid">
                <FieldHelp
                  label="Demo organization name"
                  required
                  error={submitted ? errors.demoOrgName ?? null : null}
                  info="Organization name created by the seed step after infrastructure validation succeeds."
                  example="CursorTalk Demo"
                >
                  <input
                    type="text"
                    value={form.demoOrgName}
                    onChange={(event) => updateField("demoOrgName", event.target.value)}
                    aria-invalid={submitted && !!errors.demoOrgName}
                  />
                </FieldHelp>

                <div className="cf-subsection">
                  <div className="cf-subsection-header">
                    <h3>Owner user</h3>
                    <p>Primary seeded login for the enterprise administrator.</p>
                  </div>
                  <div className="cf-grid cf-grid-2">
                    <FieldHelp
                      label="Owner email"
                      required
                      error={submitted ? errors.ownerEmail ?? null : null}
                      info="Email address for the seeded organization owner account."
                      example="owner@example.com"
                    >
                      <input
                        type="email"
                        value={form.ownerEmail}
                        onChange={(event) => updateField("ownerEmail", event.target.value)}
                        aria-invalid={submitted && !!errors.ownerEmail}
                      />
                    </FieldHelp>
                    <FieldHelp
                      label="Owner password"
                      required
                      error={submitted ? errors.ownerPassword ?? null : null}
                      info="Password for the seeded owner login. This is printed in the final success message after setup."
                      example="ReplaceOwnerPassword123!"
                    >
                      <input
                        type="text"
                        value={form.ownerPassword}
                        onChange={(event) => updateField("ownerPassword", event.target.value)}
                        aria-invalid={submitted && !!errors.ownerPassword}
                      />
                    </FieldHelp>
                    <FieldHelp
                      label="Owner first name"
                      required
                      error={submitted ? errors.ownerFirstName ?? null : null}
                      info="First name for the seeded owner user record."
                      example="Demo"
                    >
                      <input
                        type="text"
                        value={form.ownerFirstName}
                        onChange={(event) => updateField("ownerFirstName", event.target.value)}
                        aria-invalid={submitted && !!errors.ownerFirstName}
                      />
                    </FieldHelp>
                    <FieldHelp
                      label="Owner last name"
                      required
                      error={submitted ? errors.ownerLastName ?? null : null}
                      info="Last name for the seeded owner user record."
                      example="Owner"
                    >
                      <input
                        type="text"
                        value={form.ownerLastName}
                        onChange={(event) => updateField("ownerLastName", event.target.value)}
                        aria-invalid={submitted && !!errors.ownerLastName}
                      />
                    </FieldHelp>
                  </div>
                </div>

                <div className="cf-subsection">
                  <div className="cf-subsection-header">
                    <h3>Member user</h3>
                    <p>Secondary seeded login used for validation and handoff.</p>
                  </div>
                  <div className="cf-grid cf-grid-2">
                    <FieldHelp
                      label="Member email"
                      required
                      error={submitted ? errors.memberEmail ?? null : null}
                      info="Email address for the seeded member account."
                      example="member@example.com"
                    >
                      <input
                        type="email"
                        value={form.memberEmail}
                        onChange={(event) => updateField("memberEmail", event.target.value)}
                        aria-invalid={submitted && !!errors.memberEmail}
                      />
                    </FieldHelp>
                    <FieldHelp
                      label="Member password"
                      required
                      error={submitted ? errors.memberPassword ?? null : null}
                      info="Password for the seeded member login. This is printed in the final success summary after setup."
                      example="ReplaceMemberPassword123!"
                    >
                      <input
                        type="text"
                        value={form.memberPassword}
                        onChange={(event) => updateField("memberPassword", event.target.value)}
                        aria-invalid={submitted && !!errors.memberPassword}
                      />
                    </FieldHelp>
                    <FieldHelp
                      label="Member first name"
                      required
                      error={submitted ? errors.memberFirstName ?? null : null}
                      info="First name for the seeded member record."
                      example="Demo"
                    >
                      <input
                        type="text"
                        value={form.memberFirstName}
                        onChange={(event) => updateField("memberFirstName", event.target.value)}
                        aria-invalid={submitted && !!errors.memberFirstName}
                      />
                    </FieldHelp>
                    <FieldHelp
                      label="Member last name"
                      required
                      error={submitted ? errors.memberLastName ?? null : null}
                      info="Last name for the seeded member record."
                      example="Member"
                    >
                      <input
                        type="text"
                        value={form.memberLastName}
                        onChange={(event) => updateField("memberLastName", event.target.value)}
                        aria-invalid={submitted && !!errors.memberLastName}
                      />
                    </FieldHelp>
                  </div>
                </div>

                <ExtraSeedUsers
                  title="Additional owners"
                  users={form.additionalOwners}
                  onAdd={() => addExtraUser("additionalOwners")}
                  onRemove={(index) => removeExtraUser("additionalOwners", index)}
                  onChange={(index, key, value) =>
                    updateExtraUser("additionalOwners", index, key, value)
                  }
                />
                {submitted && errors.additionalOwners ? (
                  <span className="cf-field-error">{errors.additionalOwners}</span>
                ) : null}

                <ExtraSeedUsers
                  title="Additional members"
                  users={form.additionalMembers}
                  onAdd={() => addExtraUser("additionalMembers")}
                  onRemove={(index) => removeExtraUser("additionalMembers", index)}
                  onChange={(index, key, value) =>
                    updateExtraUser("additionalMembers", index, key, value)
                  }
                />
                {submitted && errors.additionalMembers ? (
                  <span className="cf-field-error">{errors.additionalMembers}</span>
                ) : null}
              </div>

              <div className="cf-form-actions">
                <button className="mk-button mk-button-large mk-button-primary" type="submit">
                  <Download size={16} strokeWidth={2} />
                  Submit and download config
                </button>
              </div>
            </section>
            {downloaded ? (
              <div className="cf-submit-note">
                <div className="cf-status-chip">
                  <CheckCircle2 size={16} strokeWidth={2} />
                  <span>Config downloaded successfully</span>
                </div>
                <p>
                  The generated file matches the expected <code>customer-config.json</code> format
                  used by the infrastructure setup scripts.
                </p>
              </div>
            ) : null}
          </div>
        </form>
      </main>
    </div>
  );
}
