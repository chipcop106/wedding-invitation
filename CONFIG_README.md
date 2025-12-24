# Configuration System

This wedding invitation system now supports dynamic configuration based on query parameters. You can customize the content displayed on the invitation page by using the `gender` query parameter and editing the `config.json` file.

## Usage

### Query Parameters

Add `?gender=male` or `?gender=female` to the URL to load the corresponding configuration:

- `?gender=male` - Loads the male configuration
- `?gender=female` - Loads the female configuration
- No parameter or invalid value - Defaults to `male`

**Examples:**
```
https://your-domain.com/?gender=male
https://your-domain.com/?gender=female
https://your-domain.com/?gender=male&to=GuestName
```

### Configuration File

Edit `config.json` to customize the content for each gender option. The file structure includes:

#### Top Level Structure
```json
{
  "male": { ... },
  "female": { ... }
}
```

#### Configuration Sections

Each gender configuration (`male` or `female`) contains:

1. **Basic Information**
   - `title` - Page title
   - `coupleNames` - Names of the couple
   - `weddingDate` - Formatted wedding date string
   - `weddingTime` - Wedding date/time in format "YYYY-MM-DD HH:mm:ss"

2. **Groom Information** (`groom`)
   - `name` - Groom's name
   - `relation` - Relationship (e.g., "Con trai")
   - `father` - Father's name
   - `mother` - Mother's name

3. **Bride Information** (`bride`)
   - `name` - Bride's name
   - `relation` - Relationship (e.g., "Con gái")
   - `father` - Father's name
   - `mother` - Mother's name

4. **Wedding Events** (`wedding`)
   - `ceremony` - Ceremony details
     - `title` - Event title
     - `time` - Event time description
     - `enabled` - Boolean to show/hide this event
   - `reception` - Reception details (same structure as ceremony)

5. **Location** (`location`)
   - `address` - Full address string
   - `googleMapsUrl` - Google Maps URL

6. **Dresscode** (`dresscode`)
   - `colors` - Array of hex color codes (e.g., `["#F5F5DC", "#808000", "#000000"]`)

7. **Gift Information** (`gift`)
   - `transfer` - Bank transfer details
     - `name` - Account holder name
     - `bank` - Bank name
     - `account` - Account number
   - `qrcode` - QR code payment
     - `name` - Account holder name
     - `image` - Path to QR code image
   - `physical` - Physical gift delivery
     - `name` - Contact name
     - `phone` - Contact phone
     - `address` - Delivery address

8. **Messages** (`messages`)
   - `invitation` - Invitation message (supports HTML)
   - `dresscode` - Dresscode message (supports HTML)
   - `gift` - Gift section message
   - `closing` - Closing message
   - `greeting` - Greeting message

## How It Works

1. When the page loads, the `configLoader` module reads the `gender` query parameter
2. It fetches `config.json` and selects the appropriate configuration
3. The configuration is applied to HTML elements using `data-config` attributes
4. All text content, times, locations, and other data are dynamically populated

## HTML Data Attributes

The HTML uses `data-config` attributes to mark elements that should be populated dynamically:

- `data-config="coupleNames"` - Couple names
- `data-config="weddingDate"` - Wedding date
- `data-config="groom.name"` - Groom's name
- `data-config="bride.name"` - Bride's name
- `data-config="location.address"` - Address
- `data-config="messages.invitation"` - Invitation message
- And many more...

For sections that should be shown/hidden:
- `data-config-section="wedding.ceremony"` - Ceremony section
- `data-config-section="wedding.reception"` - Reception section

## Customization

To customize the invitation:

1. Open `config.json`
2. Edit the values in the `male` or `female` object (or both)
3. Save the file
4. Access the page with the appropriate `?gender=` parameter

## Notes

- The wedding time from config is also applied to the `data-time` attribute on the body element for countdown functionality
- Google Calendar integration uses the config values for event details
- All copy-to-clipboard buttons automatically update with the config values
- The system falls back to default values if config loading fails

