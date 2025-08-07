# MC Stats Viewer

A web-based tool for analyzing and visualizing Minecraft player statistics across multiple worlds with interactive charts and detailed breakdowns.

## Features

- 📊 **Multi-World Analysis** - Load and analyze stats from multiple Minecraft worlds simultaneously
- 👥 **Player Statistics** - View individual player stats or combine data from all players
- 📈 **Interactive Charts** - Visual representations of play time, activities, deaths, mining, and more
- 🔍 **Simple Filtering** - Filter data by player or sort by various metrics

### Main Dashboard
View combined statistics with interactive charts showing player distribution and play time.

### Individual Player Stats
Detailed breakdown of each player's activities including movement, combat, crafting, and more.

### Analytics Section
Advanced charts showing deaths distribution, block mining, and activity comparisons.

## How to Use

1. **Open the Application**
   - Simply open [`index.html`](index.html) in any modern web browser

2. **Select Your Minecraft Saves Folder**
   - Click "Choose Minecraft Saves Folder"
   - Navigate to your Minecraft saves directory (usually `%appdata%/.minecraft/saves`)
   - Select the entire saves folder

3. **Explore Your Stats**
   - **Combined Stats**: View aggregated statistics across all worlds
   - **By World**: Examine stats for individual worlds
   - **Analytics**: Interactive charts and visualizations

## Supported Statistics

### Game Statistics
- Play time, deaths, mob kills, player kills
- Distance traveled (walking, sprinting, flying, swimming, etc.)
- Damage dealt and taken
- Interactions with blocks and items

### Activities
- Blocks mined, items crafted, tools broken
- Items picked up and dropped
- Mob kills and death causes
- Chest openings, bed usage, trading

### Advanced Metrics
- Movement patterns and distances
- Combat effectiveness
- Resource gathering efficiency
- World exploration metrics

## Technical Details

### File Structure
```
mc-stats-viewer/
├── index.html          # Main application page
├── script.js           # Core JavaScript functionality
├── style.css           # Styling and layout
├── favicon.png         # Application icon
└── README.md           # This file
```

### Dependencies
- [Chart.js](https://www.chartjs.org/) - For interactive charts and visualizations
- [Font Awesome](https://fontawesome.com/) - For icons
- [Google Fonts (Inter)](https://fonts.google.com/) - Typography

### Browser Compatibility
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Data Sources

The application reads JSON files from your Minecraft saves directory:
- `saves/[world_name]/stats/[player_uuid].json` - Player statistics files
- Automatically fetches player usernames from Mojang API when possible

## Privacy & Security

- **Local Processing**: All data processing happens locally in your browser
- **No Data Upload**: Your Minecraft stats never leave your computer
- **Username Fetching**: Only player UUIDs are sent to Mojang's API to retrieve usernames
- **Offline Capable**: Works without internet (usernames will show as Player_[UUID] instead)

## Features in Detail

### Combined Statistics
- Aggregate stats from all worlds for each player
- Toggle between individual players and all-players-combined view
- Visual charts showing play time distribution and player counts per world

### World Analysis
- Filter by specific players
- Sort worlds by name, play time, or player count
- Detailed breakdown of each world's statistics

### Advanced Analytics
- **Top Activities**: Bar chart of most common player activities
- **Distance Traveled**: Line chart showing movement patterns
- **Deaths Distribution**: Pie chart of death causes
- **Block Mining**: Doughnut chart of most mined blocks

### Data Visualization
- Interactive charts using Chart.js
- Responsive design that works on all screen sizes
- Color-coded categories and intuitive icons
- Hover effects and detailed tooltips

## Troubleshooting

### No Stats Found
- Ensure you selected the correct saves folder
- Make sure the worlds have been played and contain player data
- Check that the folder contains `stats` subdirectories with `.json` files

### Charts Not Loading
- Ensure you have an internet connection for Chart.js CDN
- Try refreshing the page
- Check browser console for any JavaScript errors

### Performance Issues
- Large numbers of worlds or extensive play time may cause slower loading
- Consider analyzing subsets of worlds for better performance

## Contributing

This is a client-side web application. To contribute:
1. Fork the repository
2. Make your changes to [`script.js`](script.js), [`style.css`](style.css), or [`index.html`](index.html)
3. Test thoroughly with various Minecraft save files
4. Submit a pull request

## License

This project is open source and available under the MIT License.