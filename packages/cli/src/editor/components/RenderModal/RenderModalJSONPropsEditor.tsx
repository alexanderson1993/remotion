import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Button} from '../../../preview-server/error-overlay/remotion-overlay/Button';
import {useKeybinding} from '../../helpers/use-keybinding';
import {Row, Spacing} from '../layout';
import {RemTextarea} from '../NewComposition/RemTextarea';
import {ValidationMessage} from '../NewComposition/ValidationMessage';
import type {State} from './RenderModalData';
import type {SerializedJSONWithCustomFields} from './SchemaEditor/input-props-serialization';

const style: React.CSSProperties = {
	fontFamily: 'monospace',
	flex: 1,
};

const schemaButton: React.CSSProperties = {
	border: 'none',
	padding: 0,
	display: 'inline-block',
	cursor: 'pointer',
	backgroundColor: 'transparent',
};

const scrollable: React.CSSProperties = {
	padding: '8px 12px',
	display: 'flex',
	flexDirection: 'column',
	flex: 1,
};

export type EditType = 'inputProps' | 'defaultProps';

export const RenderModalJSONPropsEditor: React.FC<{
	value: unknown;
	setValue: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
	zodValidationResult: Zod.SafeParseReturnType<unknown, unknown>;
	switchToSchema: () => void;
	onSave: () => void;
	valBeforeSafe: unknown;
	showSaveButton: boolean;
	parseJSON: (str: string) => State;
	serializedJSON: SerializedJSONWithCustomFields | null;
	compact: boolean;
}> = ({
	setValue,
	value,
	zodValidationResult,
	switchToSchema,
	onSave,
	valBeforeSafe,
	showSaveButton,
	parseJSON,
	serializedJSON,
	compact: inSidebar,
}) => {
	if (serializedJSON === null) {
		throw new Error('expecting serializedJSON to be defined');
	}

	const [windowHeight, setWindowHeight] = useState(window.innerHeight);

	useEffect(() => {
		const handleResize = () => {
			setWindowHeight(window.innerHeight);
		};

		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
		};
	}, []);

	const textAreaStyle: React.CSSProperties = useMemo(() => {
		if (inSidebar) {
			return {
				...style,
				maxHeight: windowHeight - 300,
			};
		}

		const maxHeight = 340;
		const dynamicHeight =
			windowHeight > 550 ? windowHeight / 2.2 : windowHeight - 300;

		return {
			...style,
			maxHeight: windowHeight > 700 ? maxHeight : dynamicHeight,
		};
	}, [inSidebar, windowHeight]);

	const keybindings = useKeybinding();

	const [localValue, setLocalValue] = React.useState<State>(() => {
		return parseJSON(serializedJSON.serializedString);
	});

	const onPretty = useCallback(() => {
		if (!localValue.validJSON) {
			return;
		}

		const parsed = JSON.parse(localValue.str);
		setLocalValue({...localValue, str: JSON.stringify(parsed, null, 2)});
	}, [localValue, setLocalValue]);

	const onChange: React.ChangeEventHandler<HTMLTextAreaElement> = useCallback(
		(e) => {
			const parsed = parseJSON(e.target.value);

			if (parsed.validJSON) {
				setLocalValue({
					str: e.target.value,
					value: parsed.value,
					validJSON: parsed.validJSON,
				});
			} else {
				setLocalValue({
					str: e.target.value,
					validJSON: parsed.validJSON,
					error: parsed.error,
				});
			}

			if (parsed.validJSON) {
				setValue(parsed.value);
			}
		},
		[parseJSON, setLocalValue, setValue]
	);

	const hasChanged = useMemo(() => {
		return value && JSON.stringify(value) !== JSON.stringify(valBeforeSafe);
	}, [valBeforeSafe, value]);

	const onQuickSave = useCallback(() => {
		if (hasChanged) {
			onSave();
		}
	}, [hasChanged, onSave]);

	useEffect(() => {
		const save = keybindings.registerKeybinding({
			event: 'keydown',
			key: 's',
			commandCtrlKey: true,
			callback: onQuickSave,
			preventDefault: true,
			triggerIfInputFieldFocused: true,
		});

		return () => {
			save.unregister();
		};
	}, [keybindings, onQuickSave, onSave]);

	return (
		<div style={scrollable}>
			<RemTextarea
				onChange={onChange}
				value={localValue.str}
				status={localValue.validJSON ? 'ok' : 'error'}
				style={textAreaStyle}
			/>
			<Spacing y={1} />
			{localValue.validJSON === false ? (
				<ValidationMessage
					align="flex-start"
					message={localValue.error}
					type="error"
				/>
			) : zodValidationResult.success === false ? (
				<button type="button" style={schemaButton} onClick={switchToSchema}>
					<ValidationMessage
						align="flex-start"
						message="Does not match schema"
						type="warning"
					/>
				</button>
			) : null}
			<Spacing y={1} />
			<Row>
				<Button disabled={!localValue.validJSON} onClick={onPretty}>
					Format JSON
				</Button>
				<Spacing x={1} />
				<Button
					onClick={onSave}
					disabled={
						!zodValidationResult.success || !hasChanged || !showSaveButton
					}
				>
					Save
				</Button>
			</Row>
		</div>
	);
};
