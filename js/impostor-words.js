/* Bundled word list for the Impostor word game.
 * 15 categories × 100 words. Plain data — no network access needed.
 * Works in the browser (CGR.impostorWords) and in Node (module.exports) for tests. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.CGR = root.CGR || {}; root.CGR.impostorWords = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  return {
    'Food': [
      'Pizza', 'Burger', 'Sushi', 'Pancakes', 'Spaghetti', 'Tacos', 'Ice cream', 'Chocolate', 'Popcorn', 'Sandwich',
      'Omelette', 'Curry', 'Lasagne', 'Doughnut', 'Croissant', 'Hot dog', 'French fries', 'Salad', 'Soup', 'Cheesecake',
      'Waffles', 'Burrito', 'Dumplings', 'Noodles', 'Steak', 'Fried chicken', 'Fish and chips', 'Porridge', 'Bagel', 'Muffin',
      'Cupcake', 'Brownie', 'Nachos', 'Kebab', 'Risotto', 'Paella', 'Toast', 'Scrambled eggs', 'Bacon', 'Sausage roll',
      'Meatballs', 'Apple pie', 'Cereal', 'Yoghurt', 'Cheese', 'Peanut butter', 'Jam', 'Honey', 'Pretzel', 'Milkshake',
      'Roast dinner', 'Shepherd’s pie', 'Pasta bake', 'Mac and cheese', 'Fajitas', 'Quesadilla', 'Enchiladas', 'Spring rolls', 'Fried rice', 'Sweet and sour chicken',
      'Ramen', 'Pad Thai', 'Falafel', 'Hummus', 'Garlic bread', 'Baked potato', 'Mashed potato', 'Roast chicken', 'Chicken nuggets', 'Fish fingers',
      'Pork pie', 'Scotch egg', 'Cornish pasty', 'Crumpet', 'Scone', 'Trifle', 'Jelly', 'Custard', 'Rice pudding', 'Tiramisu',
      'Pavlova', 'Carrot cake', 'Gingerbread', 'Flapjack', 'Biscuit', 'Cookie', 'Marshmallow', 'Candyfloss', 'Toffee apple', 'Lollipop',
      'Hot chocolate', 'Smoothie', 'Lemonade', 'Corn on the cob', 'Coleslaw', 'Chilli con carne', 'Beef stew', 'Pork chop', 'Prawn cocktail', 'Victoria sponge'
    ],
    'Animals': [
      'Lion', 'Elephant', 'Giraffe', 'Penguin', 'Kangaroo', 'Dolphin', 'Shark', 'Octopus', 'Tiger', 'Zebra',
      'Monkey', 'Gorilla', 'Koala', 'Panda', 'Polar bear', 'Crocodile', 'Snake', 'Frog', 'Owl', 'Eagle',
      'Parrot', 'Flamingo', 'Peacock', 'Horse', 'Cow', 'Pig', 'Sheep', 'Goat', 'Chicken', 'Duck',
      'Rabbit', 'Hedgehog', 'Squirrel', 'Fox', 'Wolf', 'Deer', 'Camel', 'Hippo', 'Rhino', 'Cheetah',
      'Bat', 'Spider', 'Butterfly', 'Bee', 'Ant', 'Snail', 'Tortoise', 'Whale', 'Jellyfish', 'Seal',
      'Leopard', 'Jaguar', 'Hyena', 'Meerkat', 'Lemur', 'Sloth', 'Armadillo', 'Anteater', 'Platypus', 'Wombat',
      'Otter', 'Beaver', 'Badger', 'Mole', 'Mouse', 'Rat', 'Hamster', 'Guinea pig', 'Ferret', 'Raccoon',
      'Skunk', 'Moose', 'Reindeer', 'Bison', 'Donkey', 'Llama', 'Alpaca', 'Yak', 'Walrus', 'Sea lion',
      'Swan', 'Goose', 'Turkey', 'Ostrich', 'Emu', 'Pelican', 'Toucan', 'Hummingbird', 'Woodpecker', 'Seagull',
      'Crow', 'Pigeon', 'Robin', 'Lizard', 'Chameleon', 'Iguana', 'Starfish', 'Crab', 'Lobster', 'Seahorse'
    ],
    'Places': [
      'Beach', 'Airport', 'Hospital', 'School', 'Library', 'Museum', 'Zoo', 'Cinema', 'Supermarket', 'Restaurant',
      'Hotel', 'Train station', 'Swimming pool', 'Gym', 'Park', 'Farm', 'Castle', 'Church', 'Desert', 'Jungle',
      'Mountain', 'Island', 'Cave', 'Volcano', 'Prison', 'Police station', 'Fire station', 'Post office', 'Bank', 'Bakery',
      'Hairdresser', 'Theme park', 'Circus', 'Stadium', 'Campsite', 'Lighthouse', 'Space station', 'Submarine', 'Pirate ship', 'Igloo',
      'Treehouse', 'Bowling alley', 'Car wash', 'Petrol station', 'Laundrette', 'Casino', 'Nightclub', 'Wedding venue', 'Dentist', 'Office',
      'Shopping centre', 'Car park', 'Bus stop', 'Garden centre', 'Playground', 'Skate park', 'Golf course', 'Ski resort', 'Water park', 'Aquarium',
      'Planetarium', 'Art gallery', 'Theatre', 'Concert hall', 'Town hall', 'Courtroom', 'Palace', 'Cathedral', 'Mosque', 'Temple',
      'Graveyard', 'Haunted house', 'Market', 'Garage', 'Factory', 'Warehouse', 'Power station', 'Oil rig', 'Harbour', 'Pier',
      'Canal', 'Vineyard', 'Orchard', 'Coffee shop', 'Pub', 'Ice rink', 'Escape room', 'Arcade', 'Bookshop', 'Toy shop',
      'Pet shop', 'Barber shop', 'Laboratory', 'Recording studio', 'TV studio', 'Spa', 'Hostel', 'Fairground', 'Waiting room', 'Youth club'
    ],
    'Jobs': [
      'Doctor', 'Nurse', 'Teacher', 'Firefighter', 'Police officer', 'Chef', 'Pilot', 'Astronaut', 'Farmer', 'Plumber',
      'Electrician', 'Builder', 'Carpenter', 'Mechanic', 'Dentist', 'Vet', 'Lawyer', 'Judge', 'Accountant', 'Banker',
      'Hairdresser', 'Waiter', 'Cashier', 'Postman', 'Taxi driver', 'Bus driver', 'Lifeguard', 'Soldier', 'Sailor', 'Scientist',
      'Engineer', 'Architect', 'Artist', 'Photographer', 'Journalist', 'Actor', 'Singer', 'Dancer', 'Magician', 'Clown',
      'Librarian', 'Gardener', 'Butcher', 'Baker', 'Fisherman', 'Detective', 'Spy', 'Zookeeper', 'Programmer', 'Referee',
      'Surgeon', 'Paramedic', 'Pharmacist', 'Optician', 'Midwife', 'Cleaner', 'Caretaker', 'Security guard', 'Receptionist', 'Estate agent',
      'Shop assistant', 'Barista', 'Bartender', 'Delivery driver', 'Train driver', 'Lorry driver', 'Flight attendant', 'Ship captain', 'Tour guide', 'Translator',
      'Nanny', 'Social worker', 'Priest', 'Politician', 'Mayor', 'Personal trainer', 'Footballer', 'Jockey', 'Coach', 'Comedian',
      'DJ', 'Musician', 'Painter and decorator', 'Tailor', 'Florist', 'Jeweller', 'Locksmith', 'Roofer', 'Window cleaner', 'Bin collector',
      'Miner', 'Lumberjack', 'Beekeeper', 'Archaeologist', 'Professor', 'Psychologist', 'Fashion designer', 'Model', 'Influencer', 'Game designer'
    ],
    'Movies': [
      'Titanic', 'Jaws', 'Star Wars', 'The Lion King', 'Frozen', 'Toy Story', 'Finding Nemo', 'Jurassic Park', 'Harry Potter', 'The Matrix',
      'Shrek', 'Avatar', 'Home Alone', 'Back to the Future', 'Ghostbusters', 'Rocky', 'Grease', 'The Wizard of Oz', 'E.T.', 'Indiana Jones',
      'The Godfather', 'Forrest Gump', 'Pirates of the Caribbean', 'The Lord of the Rings', 'Mary Poppins', 'Top Gun', 'Gladiator', 'Up', 'Cars', 'Moana',
      'Aladdin', 'Cinderella', 'The Incredibles', 'Ratatouille', 'Spider-Man', 'Batman', 'Superman', 'King Kong', 'Mamma Mia', 'Paddington',
      'Jumanji', 'Beauty and the Beast', 'The Little Mermaid', 'Monsters, Inc.', 'Despicable Me', 'Kung Fu Panda', 'Madagascar', 'Coco', 'Inside Out', 'Barbie',
      'The Terminator', 'Alien', 'Psycho', 'The Shining', 'Casablanca', 'The Sound of Music', 'Star Trek', 'Mission: Impossible', 'James Bond', 'Die Hard',
      'Men in Black', 'The Truman Show', 'Groundhog Day', 'Dirty Dancing', 'Notting Hill', 'Love Actually', 'Mean Girls', 'Legally Blonde', 'School of Rock', 'Night at the Museum',
      'Elf', 'The Polar Express', 'The Grinch', 'Charlie and the Chocolate Factory', 'Matilda', 'Hook', 'Peter Pan', 'Snow White', 'Bambi', 'Dumbo',
      'Pinocchio', 'The Jungle Book', '101 Dalmatians', 'Tangled', 'Encanto', 'Zootopia', 'WALL-E', 'Mulan', 'Lilo & Stitch', 'Chicken Run',
      'The Hunger Games', 'Fast & Furious', 'Transformers', 'The Avengers', 'Black Panther', 'Iron Man', 'Minions', 'Ice Age', 'How to Train Your Dragon', 'The Lego Movie'
    ],
    'Sports': [
      'Football', 'Basketball', 'Tennis', 'Cricket', 'Rugby', 'Golf', 'Swimming', 'Boxing', 'Baseball', 'Ice hockey',
      'Volleyball', 'Badminton', 'Table tennis', 'Cycling', 'Skiing', 'Snowboarding', 'Surfing', 'Skateboarding', 'Gymnastics', 'Athletics',
      'Marathon', 'Wrestling', 'Judo', 'Karate', 'Fencing', 'Archery', 'Rowing', 'Sailing', 'Canoeing', 'Horse racing',
      'Darts', 'Snooker', 'Bowling', 'Netball', 'Handball', 'Water polo', 'Diving', 'Climbing', 'Triathlon', 'Formula 1',
      'Motocross', 'Ice skating', 'Curling', 'Lacrosse', 'Polo', 'Squash', 'Weightlifting', 'Hurdles', 'High jump', 'Javelin',
      'American football', 'Softball', 'Field hockey', 'Kickboxing', 'Taekwondo', 'Sumo wrestling', 'Bobsleigh', 'Luge', 'Ski jumping', 'Speed skating',
      'Figure skating', 'BMX', 'Mountain biking', 'Kitesurfing', 'Windsurfing', 'Water skiing', 'Bungee jumping', 'Skydiving', 'Paragliding', 'Bouldering',
      'Parkour', 'Pole vault', 'Long jump', 'Triple jump', 'Shot put', 'Discus', 'Hammer throw', 'Relay race', 'Sprinting', 'Decathlon',
      'Orienteering', 'Pickleball', 'Padel', 'Dodgeball', 'Hurling', 'Gaelic football', 'Beach volleyball', 'Rodeo', 'Show jumping', 'Dressage',
      'Powerlifting', 'Tug of war', 'Croquet', 'Pétanque', 'Esports', 'Synchronised swimming', 'Biathlon', 'Mixed martial arts', 'Rounders', 'Cross-country running'
    ],
    'Household Items': [
      'Sofa', 'Bed', 'Pillow', 'Blanket', 'Lamp', 'Mirror', 'Clock', 'Television', 'Fridge', 'Oven',
      'Microwave', 'Kettle', 'Toaster', 'Dishwasher', 'Washing machine', 'Vacuum cleaner', 'Iron', 'Broom', 'Mop', 'Bucket',
      'Toothbrush', 'Towel', 'Bathtub', 'Shower', 'Toilet', 'Sink', 'Curtains', 'Carpet', 'Doormat', 'Coat hanger',
      'Wardrobe', 'Bookshelf', 'Armchair', 'Dining table', 'Frying pan', 'Saucepan', 'Teapot', 'Fork', 'Spoon', 'Knife',
      'Plate', 'Mug', 'Bin', 'Candle', 'Remote control', 'Light bulb', 'Plug', 'Radiator', 'Hairdryer', 'Alarm clock',
      'Cushion', 'Duvet', 'Chest of drawers', 'Bedside table', 'Laundry basket', 'Clothes peg', 'Washing line', 'Ironing board', 'Tumble dryer', 'Freezer',
      'Blender', 'Coffee machine', 'Can opener', 'Corkscrew', 'Grater', 'Peeler', 'Whisk', 'Rolling pin', 'Chopping board', 'Colander',
      'Sieve', 'Tea towel', 'Oven glove', 'Kitchen roll', 'Tin foil', 'Ice cube tray', 'Bath mat', 'Shower curtain', 'Toilet roll', 'Toothpaste',
      'Hairbrush', 'Comb', 'Doorbell', 'Letterbox', 'Key', 'Smoke alarm', 'Fan', 'Torch', 'Picture frame', 'Vase',
      'Plant pot', 'Fireplace', 'Rug', 'Stool', 'Bunk bed', 'Dustpan and brush', 'Sponge', 'Washing-up liquid', 'Extension lead', 'Hot water bottle'
    ],
    'Countries': [
      'France', 'Spain', 'Italy', 'Germany', 'Greece', 'Portugal', 'Ireland', 'Scotland', 'Wales', 'England',
      'Norway', 'Sweden', 'Iceland', 'Russia', 'China', 'Japan', 'India', 'Thailand', 'Australia', 'New Zealand',
      'Canada', 'United States', 'Mexico', 'Brazil', 'Argentina', 'Peru', 'Chile', 'Egypt', 'Kenya', 'South Africa',
      'Morocco', 'Nigeria', 'Turkey', 'Israel', 'Saudi Arabia', 'Iran', 'Pakistan', 'Vietnam', 'Indonesia', 'Philippines',
      'South Korea', 'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Poland', 'Denmark', 'Finland', 'Jamaica', 'Cuba',
      'Colombia', 'Venezuela', 'Ecuador', 'Bolivia', 'Uruguay', 'Costa Rica', 'Panama', 'Dominican Republic', 'Bahamas', 'Barbados',
      'Ghana', 'Ethiopia', 'Tanzania', 'Uganda', 'Zimbabwe', 'Botswana', 'Namibia', 'Madagascar', 'Senegal', 'Tunisia',
      'Algeria', 'Jordan', 'Lebanon', 'Qatar', 'United Arab Emirates', 'Nepal', 'Bangladesh', 'Sri Lanka', 'Maldives', 'Mongolia',
      'Cambodia', 'Malaysia', 'Singapore', 'Ukraine', 'Romania', 'Bulgaria', 'Hungary', 'Czech Republic', 'Croatia', 'Serbia',
      'Slovenia', 'Estonia', 'Latvia', 'Lithuania', 'Luxembourg', 'Monaco', 'Malta', 'Cyprus', 'Fiji', 'Papua New Guinea'
    ],
    'Clothing': [
      'T-shirt', 'Jeans', 'Jumper', 'Hoodie', 'Jacket', 'Coat', 'Raincoat', 'Dress', 'Skirt', 'Shorts',
      'Trousers', 'Suit', 'Tie', 'Bow tie', 'Shirt', 'Blouse', 'Pyjamas', 'Dressing gown', 'Socks', 'Tights',
      'Trainers', 'Boots', 'Sandals', 'Flip-flops', 'Slippers', 'High heels', 'Hat', 'Cap', 'Beanie', 'Scarf',
      'Gloves', 'Mittens', 'Belt', 'Swimsuit', 'Bikini', 'Wetsuit', 'Apron', 'Uniform', 'Overalls', 'Waistcoat',
      'Cardigan', 'Kilt', 'Poncho', 'Leggings', 'Tracksuit', 'Wedding dress', 'Tuxedo', 'Crown', 'Sunglasses', 'Earmuffs',
      'Blazer', 'Polo shirt', 'Vest', 'Crop top', 'Turtleneck', 'Fleece', 'Puffer jacket', 'Gilet', 'Trench coat', 'Parka',
      'Denim jacket', 'Leather jacket', 'Cargo trousers', 'Joggers', 'Dungarees', 'Jumpsuit', 'Ballgown', 'Sundress', 'Miniskirt', 'Sari',
      'Kimono', 'Toga', 'Cape', 'Cloak', 'Onesie', 'Nightie', 'Boxer shorts', 'Bra', 'Knee socks', 'Wellies',
      'Clogs', 'Loafers', 'Ballet shoes', 'Football boots', 'Beret', 'Bowler hat', 'Cowboy hat', 'Top hat', 'Sombrero', 'Bandana',
      'Headband', 'Shawl', 'Cufflinks', 'Necklace', 'Bracelet', 'Watch', 'Handbag', 'Ski jacket', 'Bobble hat', 'Balaclava'
    ],
    'Transport': [
      'Car', 'Bus', 'Train', 'Plane', 'Helicopter', 'Bicycle', 'Motorbike', 'Scooter', 'Skateboard', 'Boat',
      'Ship', 'Ferry', 'Submarine', 'Canoe', 'Kayak', 'Sailing boat', 'Yacht', 'Cruise ship', 'Taxi', 'Tram',
      'Underground train', 'Lorry', 'Van', 'Tractor', 'Fire engine', 'Ambulance', 'Police car', 'Ice cream van', 'Limousine', 'Camper van',
      'Hot air balloon', 'Rocket', 'Spaceship', 'Cable car', 'Gondola', 'Rickshaw', 'Horse and cart', 'Sledge', 'Snowmobile', 'Jet ski',
      'Hovercraft', 'Monorail', 'Double-decker bus', 'Steam train', 'Glider', 'Unicycle', 'Tandem', 'Go-kart', 'Quad bike', 'Paraglider',
      'Electric car', 'Racing car', 'Minibus', 'Coach', 'Sports car', 'Convertible', 'Jeep', 'Pickup truck', 'Cement mixer', 'Digger',
      'Bulldozer', 'Crane', 'Forklift', 'Steamroller', 'Tank', 'Fighter jet', 'Airship', 'Seaplane', 'Jumbo jet', 'Space shuttle',
      'Lunar rover', 'Rowing boat', 'Pedalo', 'Raft', 'Speedboat', 'Narrowboat', 'Tugboat', 'Lifeboat', 'Aircraft carrier', 'Pirate ship',
      'Container ship', 'Paddle steamer', 'Funicular', 'Chairlift', 'Escalator', 'Segway', 'Hoverboard', 'Roller skates', 'Pogo stick', 'Penny-farthing',
      'Wheelbarrow', 'Shopping trolley', 'Pram', 'Wheelchair', 'Mobility scooter', 'Electric scooter', 'Moped', 'Dog sled', 'Zip line', 'Tuk-tuk'
    ],
    'Musical Instruments': [
      'Piano', 'Guitar', 'Violin', 'Drums', 'Trumpet', 'Flute', 'Saxophone', 'Cello', 'Harp', 'Clarinet',
      'Trombone', 'Tuba', 'Banjo', 'Ukulele', 'Harmonica', 'Accordion', 'Bagpipes', 'Xylophone', 'Tambourine', 'Triangle',
      'Double bass', 'Oboe', 'Bassoon', 'French horn', 'Organ', 'Keyboard', 'Synthesiser', 'Mandolin', 'Sitar', 'Didgeridoo',
      'Bongos', 'Maracas', 'Cymbals', 'Castanets', 'Glockenspiel', 'Piccolo', 'Recorder', 'Kazoo', 'Tabla', 'Steel drum',
      'Cowbell', 'Timpani', 'Marimba', 'Lute', 'Bugle', 'Viola', 'Electric guitar', 'Bass guitar', 'Harpsichord', 'Gong',
      'Ocarina', 'Pan pipes', 'Tin whistle', 'Bodhrán', 'Djembe', 'Conga', 'Snare drum', 'Bass drum', 'Drum machine', 'Theremin',
      'Concertina', 'Melodica', 'Harmonium', 'Celesta', 'Dulcimer', 'Zither', 'Autoharp', 'Balalaika', 'Bouzouki', 'Koto',
      'Shamisen', 'Erhu', 'Guzheng', 'Oud', 'Kalimba', 'Slide whistle', 'Washboard', 'Spoons', 'Jaw harp', 'Vibraphone',
      'Tubular bells', 'Handbells', 'Wind chimes', 'Rain stick', 'Shaker', 'Woodblock', 'Claves', 'Euphonium', 'Cornet', 'Flugelhorn',
      'Sousaphone', 'Cor anglais', 'Bass clarinet', 'Cajón', 'Turntables', 'Hurdy-gurdy', 'Lyre', 'Hang drum', 'Steel guitar', 'Electric piano'
    ],
    'Hobbies': [
      'Reading', 'Painting', 'Drawing', 'Knitting', 'Sewing', 'Gardening', 'Cooking', 'Baking', 'Fishing', 'Camping',
      'Hiking', 'Photography', 'Dancing', 'Singing', 'Video games', 'Board games', 'Chess', 'Jigsaw puzzles', 'Crosswords', 'Bird watching',
      'Stamp collecting', 'Origami', 'Pottery', 'Woodwork', 'Yoga', 'Running', 'Swimming', 'Cycling', 'Skateboarding', 'Rock climbing',
      'Karaoke', 'Magic tricks', 'Juggling', 'Model trains', 'Lego', 'Scrapbooking', 'Writing poetry', 'Blogging', 'Podcasting', 'Stargazing',
      'Metal detecting', 'Geocaching', 'Calligraphy', 'Embroidery', 'Kite flying', 'Surfing', 'Horse riding', 'Bowling', 'Darts', 'Quizzes',
      'Crochet', 'Quilting', 'Candle making', 'Jewellery making', 'Model making', 'Bonsai', 'Flower arranging', 'Beekeeping', 'Fossil hunting', 'Coin collecting',
      'Trading cards', 'Comic books', 'Cosplay', 'Book club', 'Creative writing', 'Learning languages', 'Family history', 'Volunteering', 'Cocktail making', 'Bread making',
      'Foraging', 'Kayaking', 'Paddleboarding', 'Scuba diving', 'Snorkelling', 'Sailing', 'Skiing', 'Ice skating', 'Roller skating', 'Martial arts',
      'Tai chi', 'Pilates', 'Zumba', 'Ballroom dancing', 'Playing guitar', 'DJing', 'Film making', 'Vlogging', 'Coding', 'Drone flying',
      'Escape rooms', 'Sudoku', 'Card games', 'Snooker', 'Table tennis', 'Golf', 'Fantasy football', 'Rock collecting', 'Sketching', 'Tie-dye'
    ],
    'Nature': [
      'Rainbow', 'Thunderstorm', 'Lightning', 'Snow', 'Rain', 'Hail', 'Fog', 'Tornado', 'Hurricane', 'Earthquake',
      'Sunset', 'Sunrise', 'Moon', 'Star', 'Comet', 'Waterfall', 'River', 'Lake', 'Ocean', 'Waves',
      'Forest', 'Rainforest', 'Desert', 'Glacier', 'Iceberg', 'Volcano', 'Mountain', 'Valley', 'Cliff', 'Cave',
      'Beach', 'Sand dune', 'Coral reef', 'Swamp', 'Meadow', 'Oak tree', 'Palm tree', 'Sunflower', 'Rose', 'Daisy',
      'Mushroom', 'Cactus', 'Moss', 'Pebble', 'Shell', 'Puddle', 'Icicle', 'Northern lights', 'Eclipse', 'Wind',
      'Thunder', 'Breeze', 'Frost', 'Dew', 'Mist', 'Drizzle', 'Blizzard', 'Heatwave', 'Drought', 'Flood',
      'Avalanche', 'Landslide', 'Tsunami', 'Whirlpool', 'Geyser', 'Hot spring', 'Canyon', 'Hill', 'Stream', 'Pond',
      'Lagoon', 'Bay', 'Marsh', 'Tundra', 'Savannah', 'Prairie', 'Tulip', 'Daffodil', 'Lily', 'Lavender',
      'Dandelion', 'Clover', 'Fern', 'Ivy', 'Bamboo', 'Pine tree', 'Willow', 'Acorn', 'Pine cone', 'Leaf',
      'Rock pool', 'Seaweed', 'Tide', 'Shooting star', 'Galaxy', 'Planet', 'Sun', 'Cloud', 'Snowflake', 'Bluebell'
    ],
    'School & Office': [
      'Pencil', 'Pen', 'Rubber', 'Ruler', 'Sharpener', 'Notebook', 'Textbook', 'Calculator', 'Scissors', 'Glue stick',
      'Stapler', 'Paper clip', 'Highlighter', 'Whiteboard', 'Chalk', 'Blackboard', 'Desk', 'Chair', 'Backpack', 'Lunchbox',
      'Pencil case', 'Homework', 'Exam', 'Report card', 'Timetable', 'Classroom', 'Playground', 'Assembly', 'Detention', 'Field trip',
      'Laptop', 'Printer', 'Photocopier', 'Computer mouse', 'Keyboard', 'Email', 'Meeting', 'Coffee break', 'Filing cabinet', 'Name badge',
      'Calendar', 'Sticky note', 'Envelope', 'Folder', 'Projector', 'Microscope', 'Globe', 'Map', 'Dictionary', 'School bell',
      'Staff room', 'Canteen', 'School bus', 'Spelling test', 'Times tables', 'Maths', 'Science', 'History', 'Geography', 'Art class',
      'PE lesson', 'Sports day', 'School play', 'Parents’ evening', 'Register', 'Gold star', 'Graduation', 'Lab coat', 'Bunsen burner', 'Test tube',
      'Protractor', 'Compass', 'Crayons', 'Felt-tip pens', 'Paintbrush', 'Easel', 'Fountain pen', 'Hole punch', 'Sticky tape', 'Drawing pin',
      'Noticeboard', 'Water cooler', 'Swivel chair', 'Video call', 'Spreadsheet', 'Presentation', 'Deadline', 'Payslip', 'Promotion', 'Office party',
      'Lanyard', 'Reception desk', 'Shredder', 'Inbox', 'Password', 'Wi-Fi', 'Headset', 'Webcam', 'Coloured pencils', 'Homework diary'
    ],
    'Fantasy & Myth': [
      'Dragon', 'Unicorn', 'Wizard', 'Witch', 'Fairy', 'Mermaid', 'Vampire', 'Werewolf', 'Ghost', 'Zombie',
      'Troll', 'Goblin', 'Elf', 'Dwarf', 'Giant', 'Ogre', 'Phoenix', 'Griffin', 'Centaur', 'Minotaur',
      'Pegasus', 'Kraken', 'Yeti', 'Loch Ness Monster', 'Genie', 'Magic carpet', 'Magic wand', 'Crystal ball', 'Spell book', 'Potion',
      'Treasure chest', 'Pirate', 'Knight', 'Princess', 'King', 'Queen', 'Castle', 'Haunted house', 'Cauldron', 'Broomstick',
      'Sphinx', 'Cyclops', 'Medusa', 'Robot', 'Alien', 'Time machine', 'Invisibility cloak', 'Superhero', 'Leprechaun', 'Tooth fairy',
      'Gnome', 'Pixie', 'Imp', 'Banshee', 'Basilisk', 'Chimera', 'Hydra', 'Sea serpent', 'Thunderbird', 'Golem',
      'Mummy', 'Skeleton', 'Bigfoot', 'Kelpie', 'Siren', 'Nymph', 'Valkyrie', 'Titan', 'Thor', 'Hercules',
      'Poseidon', 'Atlantis', 'El Dorado', 'Holy Grail', 'Excalibur', 'King Arthur', 'Merlin', 'Robin Hood', 'Dracula', 'Fairy godmother',
      'Glass slipper', 'Magic beans', 'Beanstalk', 'Gingerbread house', 'Big Bad Wolf', 'Goldilocks', 'Rapunzel', 'Pied Piper', 'Santa Claus', 'Easter Bunny',
      'Jack Frost', 'Grim Reaper', 'Ghost ship', 'Wishing well', 'Enchanted forest', 'Fountain of youth', 'Cerberus', 'Sandman', 'Frankenstein’s monster', 'Shapeshifter'
    ]
  };
});
