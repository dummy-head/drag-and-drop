import { CSSProperties, FC } from 'react'

const styles: CSSProperties = {
	border: '1px dashed gray',
	padding: '0.5rem 1rem',
	cursor: 'move',
}

export interface BoxProps {
	title: string
	yellow?: boolean
	preview?: boolean
}

export const Box: FC<BoxProps> = ({ title, yellow, preview }) => {
	const backgroundColor = yellow ? 'yellow' : 'white'
	return (
		<div
			style={{ ...styles, backgroundColor }}
			role={preview ? 'Box-Preview' : 'Box'}
		>
			{title}
		</div>
	)
}
