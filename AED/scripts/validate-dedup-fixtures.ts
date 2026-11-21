import { join } from "node:path";

type SourceRecord = {
	source_id: string;
	source_record_id: string;
};

type Override = {
	kind: string;
	a?: string;
	b?: string;
	cluster?: number;
	field?: string;
};

type Submission = {
	record_refs: string[];
};

type PairDecision = {
	a: string;
	b: string;
	decision: string;
	score?: { min: number; max: number };
	hard_conflict?: boolean;
	forced?: boolean;
};

type ReviewItem = {
	kind: string;
	severity: string;
	field_name?: string | null;
	record_refs?: string[];
};

type Canonical = {
	cluster: number;
	fields?: Record<string, unknown>;
	provenance?: Record<string, string>;
	disputed?: string[];
	license_ids?: string[];
};

type ValidationIssue = {
	record: string;
	code: string;
	severity?: string;
};

type Expected = {
	clusters: string[][];
	facility_groups?: string[][];
	pair_decisions?: PairDecision[];
	review_items?: ReviewItem[];
	canonical?: Canonical[];
	validation_issues?: ValidationIssue[];
};

type CaseDef = {
	id: string;
	split?: "dev" | "holdout";
	records: SourceRecord[];
	reimport?: SourceRecord[];
	overrides?: Override[];
	submissions?: Submission[];
	expected: Expected;
};

type Suite = {
	version: string;
	suite: string;
	cases: CaseDef[];
};

type Metrics = {
	minimum_cases: number;
	thresholds: Record<string, unknown>;
};

const fixtureDir = join(import.meta.dir, "..", "docs", "fixtures", "dedup");
const errors: string[] = [];
const caseIds = new Set<string>();

const compare = (left: string, right: string): number => {
	if (left < right) return -1;
	if (left > right) return 1;
	return 0;
};

const recordRef = (record: SourceRecord): string =>
	`${record.source_id}:${record.source_record_id}`;

const sorted = (values: string[]): string[] => [...values].sort(compare);

const checkClusterOrder = (label: string, clusters: string[][]): void => {
	const keys = clusters.map((cluster) => sorted(cluster)[0] ?? "");
	const ordered = [...keys].sort(compare);
	if (keys.join("|") !== ordered.join("|")) {
		errors.push(`${label}: clusters are not sorted by minimum record key`);
	}
};

const checkRefs = (label: string, refs: string[], known: Set<string>): void => {
	for (const ref of refs) {
		if (!known.has(ref)) errors.push(`${label}: unknown record ref ${ref}`);
	}
};

const checkScore = (label: string, score: PairDecision["score"]): void => {
	if (!score) return;
	if (score.min > score.max) {
		errors.push(`${label}: score.min > score.max`);
	}
};

for (const file of new Bun.Glob("*.cases.json").scanSync(fixtureDir)) {
	const suite = (await Bun.file(join(fixtureDir, file)).json()) as Suite;
	const expectedSuite = file.replace(".cases.json", "");
	if (suite.suite !== expectedSuite) {
		errors.push(
			`${file}: suite field ${suite.suite} does not match filename ${expectedSuite}`,
		);
	}
	if (!Array.isArray(suite.cases) || suite.cases.length === 0) {
		errors.push(`${file}: no cases`);
		continue;
	}

	for (const testCase of suite.cases) {
		const label = `${file}#${testCase.id}`;
		if (caseIds.has(testCase.id)) errors.push(`${label}: duplicate case id`);
		caseIds.add(testCase.id);
		if (testCase.split && !["dev", "holdout"].includes(testCase.split)) {
			errors.push(`${label}: invalid split ${testCase.split}`);
		}
		if (!Array.isArray(testCase.records) || testCase.records.length === 0) {
			errors.push(`${label}: no records`);
			continue;
		}

		const refs = testCase.records.map(recordRef);
		const known = new Set(refs);
		if (known.size !== refs.length) {
			errors.push(`${label}: duplicate record key in records`);
		}
		for (const record of testCase.reimport ?? []) {
			if (!known.has(recordRef(record))) {
				errors.push(`${label}: reimport key is not in records`);
			}
		}

		const expected = testCase.expected;
		if (!Array.isArray(expected.clusters) || expected.clusters.length === 0) {
			errors.push(`${label}: expected.clusters is empty`);
			continue;
		}
		checkClusterOrder(label, expected.clusters);

		const clustered = expected.clusters.flat();
		if (new Set(clustered).size !== clustered.length) {
			errors.push(`${label}: record appears in more than one cluster`);
		}
		if (clustered.length !== refs.length) {
			errors.push(
				`${label}: clusters cover ${clustered.length} records, expected ${refs.length}`,
			);
		}
		checkRefs(label, clustered, known);

		for (const group of expected.facility_groups ?? []) {
			checkRefs(label, group, known);
		}

		for (const decision of expected.pair_decisions ?? []) {
			const allowed = ["same_entity", "auto_merge", "review", "separate"];
			if (!allowed.includes(decision.decision)) {
				errors.push(`${label}: invalid pair decision ${decision.decision}`);
			}
			if (decision.a === decision.b) {
				errors.push(`${label}: pair decision compares a record with itself`);
			}
			checkRefs(label, [decision.a, decision.b], known);
			checkScore(`${label}:${decision.a}:${decision.b}`, decision.score);
		}

		for (const item of expected.review_items ?? []) {
			if (!["blocking", "warning", "info"].includes(item.severity)) {
				errors.push(`${label}: invalid review severity ${item.severity}`);
			}
			checkRefs(label, item.record_refs ?? [], known);
		}

		for (const canonical of expected.canonical ?? []) {
			if (
				!Number.isInteger(canonical.cluster) ||
				canonical.cluster < 0 ||
				canonical.cluster >= expected.clusters.length
			) {
				errors.push(`${label}: canonical cluster index is out of range`);
			}
			for (const source of Object.values(canonical.provenance ?? {})) {
				if (source !== "manual" && source !== "no_data") {
					checkRefs(label, [source], known);
				}
			}
		}

		for (const issue of expected.validation_issues ?? []) {
			checkRefs(label, [issue.record], known);
		}

		for (const override of testCase.overrides ?? []) {
			if (["force_merge", "do_not_merge"].includes(override.kind)) {
				if (!override.a || !override.b) {
					errors.push(`${label}: ${override.kind} needs a and b`);
				} else {
					checkRefs(label, [override.a, override.b], known);
				}
			}
			if (override.kind === "field_pin") {
				if (!override.field) errors.push(`${label}: field_pin needs a field`);
				if (typeof override.cluster !== "number") {
					errors.push(`${label}: field_pin needs a cluster`);
				} else if (override.cluster >= expected.clusters.length) {
					errors.push(`${label}: field_pin cluster index is out of range`);
				}
			}
		}

		for (const submission of testCase.submissions ?? []) {
			checkRefs(label, submission.record_refs, known);
		}
	}
}

const metrics = (await Bun.file(
	join(fixtureDir, "metrics.json"),
).json()) as Metrics;
const schema = (await Bun.file(
	join(fixtureDir, "fixture.schema.json"),
).json()) as Record<string, unknown>;
if (Object.keys(schema).length === 0) {
	errors.push("fixture.schema.json: empty schema");
}
if (Object.keys(metrics.thresholds).length === 0) {
	errors.push("metrics.json: no thresholds");
}
if (caseIds.size < metrics.minimum_cases) {
	errors.push(
		`fixture pack has ${caseIds.size} cases, minimum is ${metrics.minimum_cases}`,
	);
}

if (errors.length > 0) {
	console.error(
		`Dedup fixture validation failed with ${errors.length} error(s):`,
	);
	for (const error of errors) console.error(`- ${error}`);
	process.exit(1);
}

console.log(`Dedup fixtures valid: ${caseIds.size} cases across 3 suites.`);
