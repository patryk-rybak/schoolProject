import { Field, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";

interface TextFieldProps {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	type?: string;
	placeholder?: string;
}

/** Labeled text input used across the device and caretaker sections. */
export function TextField({
	id,
	label,
	value,
	onChange,
	type,
	placeholder,
}: TextFieldProps) {
	return (
		<Field>
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<Input
				id={id}
				{...(type === undefined ? {} : { type })}
				value={value}
				onChange={(event) => onChange(event.target.value)}
				{...(placeholder === undefined ? {} : { placeholder })}
			/>
		</Field>
	);
}

interface DerivedAddressFieldProps {
	id: string;
	label: string;
	value: string;
}

/** Read-only administrative address field filled by reverse geocoding. */
export function DerivedAddressField({
	id,
	label,
	value,
}: DerivedAddressFieldProps) {
	return (
		<Field>
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<Input
				id={id}
				value={value}
				readOnly={true}
				placeholder="uzupełniane automatycznie"
			/>
		</Field>
	);
}