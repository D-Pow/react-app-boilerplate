import Home from '@/components/Home';

describe('Home', () => {
    it('should render the word "Home"', () => {
        const homeComponent = global.renderWithWrappingParent(<Home />);
        const homeTextComponent = homeComponent.getByText('Home');

        expect(homeTextComponent).toBeDefined();
    });
});
