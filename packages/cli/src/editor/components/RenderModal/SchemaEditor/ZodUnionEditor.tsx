import {z} from 'remotion';
import type {JSONPath} from './zod-types';
import {ZonNonEditableValue} from './ZodNonEditableValue';
import {ZodOrNullishEditor} from './ZodOrNullishEditor';

const findNull = (
	value: readonly [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]
) => {
	const nullIndex = value.findIndex(
		(v) =>
			v._def.typeName === z.ZodFirstPartyTypeKind.ZodNull ||
			v._def.typeName === z.ZodFirstPartyTypeKind.ZodUndefined
	);
	if (nullIndex === -1) {
		return null;
	}

	const nullishValue =
		value[nullIndex]._def.typeName === z.ZodFirstPartyTypeKind.ZodNull
			? null
			: undefined;

	const otherSchema = value[nullIndex === 0 ? 1 : 0];

	const otherSchemaIsAlsoNullish =
		otherSchema._def.typeName === z.ZodFirstPartyTypeKind.ZodNull ||
		otherSchema._def.typeName === z.ZodFirstPartyTypeKind.ZodUndefined;

	return {
		nullIndex,
		nullishValue,
		otherSchema,
		otherSchemaIsAlsoNullish,
	};
};

export const ZodUnionEditor: React.FC<{
	showSaveButton: boolean;
	jsonPath: JSONPath;
	compact: boolean;
	value: unknown;
	defaultValue: unknown;
	schema: z.ZodTypeAny;
	setValue: React.Dispatch<React.SetStateAction<unknown>>;
	onSave: (updater: (oldNum: unknown) => unknown) => void;
	onRemove: null | (() => void);
}> = ({
	jsonPath,
	compact,
	schema,
	setValue,
	onSave,
	defaultValue,
	value,
	showSaveButton,
	onRemove,
}) => {
	const {options} = schema._def as z.ZodUnionDef;

	if (options.length > 2) {
		return (
			<ZonNonEditableValue
				jsonPath={jsonPath}
				label={'Union with more than 2 options not editable'}
				compact={compact}
				showSaveButton={showSaveButton}
			/>
		);
	}

	if (options.length < 2) {
		return (
			<ZonNonEditableValue
				jsonPath={jsonPath}
				label={'Union with less than 2 options not editable'}
				compact={compact}
				showSaveButton={showSaveButton}
			/>
		);
	}

	const nullResult = findNull(options);

	if (!nullResult) {
		return (
			<ZonNonEditableValue
				jsonPath={jsonPath}
				label={'Union only editable with 1 value being null'}
				compact={compact}
				showSaveButton={showSaveButton}
			/>
		);
	}

	const {otherSchema, nullishValue, otherSchemaIsAlsoNullish} = nullResult;

	if (otherSchemaIsAlsoNullish) {
		return (
			<ZonNonEditableValue
				jsonPath={jsonPath}
				label={'Not editable - both union values are nullish'}
				compact={compact}
				showSaveButton={showSaveButton}
			/>
		);
	}

	return (
		<ZodOrNullishEditor
			compact={compact}
			defaultValue={defaultValue}
			jsonPath={jsonPath}
			onRemove={onRemove}
			onSave={onSave}
			schema={otherSchema}
			setValue={setValue}
			showSaveButton={showSaveButton}
			value={value}
			nullishValue={nullishValue}
		/>
	);
};