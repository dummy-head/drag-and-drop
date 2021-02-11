import Example from '..'
import DndDustbin, { DustbinProps } from '../Dustbin'
import DndBox, { BoxProps } from '../Box'
import {
	wrapInTestContext,
	simulateDragDropSequence,
} from 'react-dnd-test-utils'
import { mount } from 'enzyme'
import { DndComponent as DndC } from 'react-dnd'

describe('Dustbin: Multiple Targets', () => {
	it('behaves as expected', () => {
		const [Wrapped, getBackend] = wrapInTestContext(Example)
		const root = mount(<Wrapped />)

		// Verify that all of the key components mounted
		const dustbins = root.find(DndDustbin)
		const boxes = root.find(DndBox)
		expect(dustbins.length).toEqual(4)
		expect(boxes.length).toEqual(3)

		window.alert = jest.fn()

		// Bin Types
		const glassBin: DndC<DustbinProps> = dustbins.at(0).instance() as any
		const foodBin: DndC<DustbinProps> = dustbins.at(1).instance() as any
		// const paperGlassUrlBin: DndC<DustbinProps> = dustbins
		// 	.at(2)
		// 	.instance() as any
		// const paperFileBin: DndC<DustbinProps> = dustbins.at(3).instance() as any

		// Box Types
		const bottleBox: DndC<BoxProps> = boxes.at(0).instance() as any
		const bananaBox: DndC<BoxProps> = boxes.at(1).instance() as any
		// const magazineBox: DndC<BoxProps> = boxes.at(2).instance() as any

		// interactions

		// drop bottle into glass bin
		simulateDragDropSequence(bottleBox, glassBin, getBackend())
		expect(glassBin.props.lastDroppedItem.name).toEqual(bottleBox.props.name)

		// food won't drop into the glass bin
		simulateDragDropSequence(bananaBox, glassBin, getBackend())
		expect(glassBin.props.lastDroppedItem.name).toEqual(bottleBox.props.name)

		// glass won't drop into the food box...
		simulateDragDropSequence(bottleBox, foodBin, getBackend())
		expect(foodBin.props.lastDroppedItem).toBeNull()

		// but some food will work
		simulateDragDropSequence(bananaBox, foodBin, getBackend())
		expect(foodBin.props.lastDroppedItem.name).toEqual(bananaBox.props.name)
	})
})
