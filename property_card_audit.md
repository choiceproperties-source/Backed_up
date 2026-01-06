# Property Card UI/UX Audit & Redesign Proposal

## 1. Current Card Analysis
### Pros:
- **Clear Hierarchy**: Image -> Info -> Actions.
- **Visual Cues**: Effective use of badges for availability and property type.
- **Dynamic Data**: Successfully pulling core fields (price, beds, baths, sqft).
- **Interactivity**: Hover elevation provides good feedback.
- **Functional Actions**: Save, Share, and Apply buttons are integrated.

### Cons:
- **Information Density**: The "est. total" and utility info (though useful) add visual noise that could be simplified for high-conversion.
- **Button Sizing**: Share and Apply buttons compete for attention. "Apply Now" should be more prominent.
- **Typography**: Some font sizes (especially for secondary info) are slightly inconsistent.
- **Mobile Behavior**: The card uses a vertical stack which is good, but doesn't transition to a horizontal layout for wider mobile screens (like large tablets).

## 2. Recommended Improvements
### Layout & Design:
- **Simplified Header**: Move the status badge to a more subtle position or combine it with the price overlay.
- **Prominent Primary Action**: Make "Apply Now" the clearly dominant button.
- **Icon Consistency**: Use slightly more refined icons and consistent sizing for stats.
- **Content Pruning**: Move "est. total" and detailed fee breakdown to the property details page to keep the card focused on "Initial Attraction".

### Essential Fields for Card:
- Main Image (images[0])
- Price (price)
- Status (listing_status)
- Title & Address
- Core Stats (Beds/Baths/Sqft)
- Key Badges (Pets, Furnished)

## 3. Redesign Implementation Plan
### UI Refinements:
- **Image Section**: Maintain 4:3 aspect ratio, but enhance the gradient overlay for better text readability.
- **Price Display**: Larger, bolder font for the monthly rent.
- **Call to Action**: Use a high-contrast primary color for "Apply Now" and a ghost/outline variant for "Share".
- **Responsive Layout**: On larger screens (grid view), maintain the vertical card. On smaller lists, allow a horizontal orientation where appropriate.

## 4. Implementation
The following code update refines the `PropertyCard` for better conversion while maintaining all backend integrations.
