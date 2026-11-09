/* Bundled word list for the Impostor word game.
 * 15 categories × 50 words. Plain data — no network access needed.
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
      'Meatballs', 'Apple pie', 'Cereal', 'Yoghurt', 'Cheese', 'Peanut butter', 'Jam', 'Honey', 'Pretzel', 'Milkshake'
    ],
    'Animals': [
      'Lion', 'Elephant', 'Giraffe', 'Penguin', 'Kangaroo', 'Dolphin', 'Shark', 'Octopus', 'Tiger', 'Zebra',
      'Monkey', 'Gorilla', 'Koala', 'Panda', 'Polar bear', 'Crocodile', 'Snake', 'Frog', 'Owl', 'Eagle',
      'Parrot', 'Flamingo', 'Peacock', 'Horse', 'Cow', 'Pig', 'Sheep', 'Goat', 'Chicken', 'Duck',
      'Rabbit', 'Hedgehog', 'Squirrel', 'Fox', 'Wolf', 'Deer', 'Camel', 'Hippo', 'Rhino', 'Cheetah',
      'Bat', 'Spider', 'Butterfly', 'Bee', 'Ant', 'Snail', 'Tortoise', 'Whale', 'Jellyfish', 'Seal'
    ],
    'Places': [
      'Beach', 'Airport', 'Hospital', 'School', 'Library', 'Museum', 'Zoo', 'Cinema', 'Supermarket', 'Restaurant',
      'Hotel', 'Train station', 'Swimming pool', 'Gym', 'Park', 'Farm', 'Castle', 'Church', 'Desert', 'Jungle',
      'Mountain', 'Island', 'Cave', 'Volcano', 'Prison', 'Police station', 'Fire station', 'Post office', 'Bank', 'Bakery',
      'Hairdresser', 'Theme park', 'Circus', 'Stadium', 'Campsite', 'Lighthouse', 'Space station', 'Submarine', 'Pirate ship', 'Igloo',
      'Treehouse', 'Bowling alley', 'Car wash', 'Petrol station', 'Laundrette', 'Casino', 'Nightclub', 'Wedding venue', 'Dentist', 'Office'
    ],
    'Jobs': [
      'Doctor', 'Nurse', 'Teacher', 'Firefighter', 'Police officer', 'Chef', 'Pilot', 'Astronaut', 'Farmer', 'Plumber',
      'Electrician', 'Builder', 'Carpenter', 'Mechanic', 'Dentist', 'Vet', 'Lawyer', 'Judge', 'Accountant', 'Banker',
      'Hairdresser', 'Waiter', 'Cashier', 'Postman', 'Taxi driver', 'Bus driver', 'Lifeguard', 'Soldier', 'Sailor', 'Scientist',
      'Engineer', 'Architect', 'Artist', 'Photographer', 'Journalist', 'Actor', 'Singer', 'Dancer', 'Magician', 'Clown',
      'Librarian', 'Gardener', 'Butcher', 'Baker', 'Fisherman', 'Detective', 'Spy', 'Zookeeper', 'Programmer', 'Referee'
    ],
    'Movies': [
      'Titanic', 'Jaws', 'Star Wars', 'The Lion King', 'Frozen', 'Toy Story', 'Finding Nemo', 'Jurassic Park', 'Harry Potter', 'The Matrix',
      'Shrek', 'Avatar', 'Home Alone', 'Back to the Future', 'Ghostbusters', 'Rocky', 'Grease', 'The Wizard of Oz', 'E.T.', 'Indiana Jones',
      'The Godfather', 'Forrest Gump', 'Pirates of the Caribbean', 'The Lord of the Rings', 'Mary Poppins', 'Top Gun', 'Gladiator', 'Up', 'Cars', 'Moana',
      'Aladdin', 'Cinderella', 'The Incredibles', 'Ratatouille', 'Spider-Man', 'Batman', 'Superman', 'King Kong', 'Mamma Mia', 'Paddington',
      'Jumanji', 'Beauty and the Beast', 'The Little Mermaid', 'Monsters, Inc.', 'Despicable Me', 'Kung Fu Panda', 'Madagascar', 'Coco', 'Inside Out', 'Barbie'
    ],
    'Sports': [
      'Football', 'Basketball', 'Tennis', 'Cricket', 'Rugby', 'Golf', 'Swimming', 'Boxing', 'Baseball', 'Ice hockey',
      'Volleyball', 'Badminton', 'Table tennis', 'Cycling', 'Skiing', 'Snowboarding', 'Surfing', 'Skateboarding', 'Gymnastics', 'Athletics',
      'Marathon', 'Wrestling', 'Judo', 'Karate', 'Fencing', 'Archery', 'Rowing', 'Sailing', 'Canoeing', 'Horse racing',
      'Darts', 'Snooker', 'Bowling', 'Netball', 'Handball', 'Water polo', 'Diving', 'Climbing', 'Triathlon', 'Formula 1',
      'Motocross', 'Ice skating', 'Curling', 'Lacrosse', 'Polo', 'Squash', 'Weightlifting', 'Hurdles', 'High jump', 'Javelin'
    ],
    'Household Items': [
      'Sofa', 'Bed', 'Pillow', 'Blanket', 'Lamp', 'Mirror', 'Clock', 'Television', 'Fridge', 'Oven',
      'Microwave', 'Kettle', 'Toaster', 'Dishwasher', 'Washing machine', 'Vacuum cleaner', 'Iron', 'Broom', 'Mop', 'Bucket',
      'Toothbrush', 'Towel', 'Bathtub', 'Shower', 'Toilet', 'Sink', 'Curtains', 'Carpet', 'Doormat', 'Coat hanger',
      'Wardrobe', 'Bookshelf', 'Armchair', 'Dining table', 'Frying pan', 'Saucepan', 'Teapot', 'Fork', 'Spoon', 'Knife',
      'Plate', 'Mug', 'Bin', 'Candle', 'Remote control', 'Light bulb', 'Plug', 'Radiator', 'Hairdryer', 'Alarm clock'
    ],
    'Countries': [
      'France', 'Spain', 'Italy', 'Germany', 'Greece', 'Portugal', 'Ireland', 'Scotland', 'Wales', 'England',
      'Norway', 'Sweden', 'Iceland', 'Russia', 'China', 'Japan', 'India', 'Thailand', 'Australia', 'New Zealand',
      'Canada', 'United States', 'Mexico', 'Brazil', 'Argentina', 'Peru', 'Chile', 'Egypt', 'Kenya', 'South Africa',
      'Morocco', 'Nigeria', 'Turkey', 'Israel', 'Saudi Arabia', 'Iran', 'Pakistan', 'Vietnam', 'Indonesia', 'Philippines',
      'South Korea', 'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Poland', 'Denmark', 'Finland', 'Jamaica', 'Cuba'
    ],
    'Clothing': [
      'T-shirt', 'Jeans', 'Jumper', 'Hoodie', 'Jacket', 'Coat', 'Raincoat', 'Dress', 'Skirt', 'Shorts',
      'Trousers', 'Suit', 'Tie', 'Bow tie', 'Shirt', 'Blouse', 'Pyjamas', 'Dressing gown', 'Socks', 'Tights',
      'Trainers', 'Boots', 'Sandals', 'Flip-flops', 'Slippers', 'High heels', 'Hat', 'Cap', 'Beanie', 'Scarf',
      'Gloves', 'Mittens', 'Belt', 'Swimsuit', 'Bikini', 'Wetsuit', 'Apron', 'Uniform', 'Overalls', 'Waistcoat',
      'Cardigan', 'Kilt', 'Poncho', 'Leggings', 'Tracksuit', 'Wedding dress', 'Tuxedo', 'Crown', 'Sunglasses', 'Earmuffs'
    ],
    'Transport': [
      'Car', 'Bus', 'Train', 'Plane', 'Helicopter', 'Bicycle', 'Motorbike', 'Scooter', 'Skateboard', 'Boat',
      'Ship', 'Ferry', 'Submarine', 'Canoe', 'Kayak', 'Sailing boat', 'Yacht', 'Cruise ship', 'Taxi', 'Tram',
      'Underground train', 'Lorry', 'Van', 'Tractor', 'Fire engine', 'Ambulance', 'Police car', 'Ice cream van', 'Limousine', 'Camper van',
      'Hot air balloon', 'Rocket', 'Spaceship', 'Cable car', 'Gondola', 'Rickshaw', 'Horse and cart', 'Sledge', 'Snowmobile', 'Jet ski',
      'Hovercraft', 'Monorail', 'Double-decker bus', 'Steam train', 'Glider', 'Unicycle', 'Tandem', 'Go-kart', 'Quad bike', 'Paraglider'
    ],
    'Musical Instruments': [
      'Piano', 'Guitar', 'Violin', 'Drums', 'Trumpet', 'Flute', 'Saxophone', 'Cello', 'Harp', 'Clarinet',
      'Trombone', 'Tuba', 'Banjo', 'Ukulele', 'Harmonica', 'Accordion', 'Bagpipes', 'Xylophone', 'Tambourine', 'Triangle',
      'Double bass', 'Oboe', 'Bassoon', 'French horn', 'Organ', 'Keyboard', 'Synthesiser', 'Mandolin', 'Sitar', 'Didgeridoo',
      'Bongos', 'Maracas', 'Cymbals', 'Castanets', 'Glockenspiel', 'Piccolo', 'Recorder', 'Kazoo', 'Tabla', 'Steel drum',
      'Cowbell', 'Timpani', 'Marimba', 'Lute', 'Bugle', 'Viola', 'Electric guitar', 'Bass guitar', 'Harpsichord', 'Gong'
    ],
    'Hobbies': [
      'Reading', 'Painting', 'Drawing', 'Knitting', 'Sewing', 'Gardening', 'Cooking', 'Baking', 'Fishing', 'Camping',
      'Hiking', 'Photography', 'Dancing', 'Singing', 'Video games', 'Board games', 'Chess', 'Jigsaw puzzles', 'Crosswords', 'Bird watching',
      'Stamp collecting', 'Origami', 'Pottery', 'Woodwork', 'Yoga', 'Running', 'Swimming', 'Cycling', 'Skateboarding', 'Rock climbing',
      'Karaoke', 'Magic tricks', 'Juggling', 'Model trains', 'Lego', 'Scrapbooking', 'Writing poetry', 'Blogging', 'Podcasting', 'Stargazing',
      'Metal detecting', 'Geocaching', 'Calligraphy', 'Embroidery', 'Kite flying', 'Surfing', 'Horse riding', 'Bowling', 'Darts', 'Quizzes'
    ],
    'Nature': [
      'Rainbow', 'Thunderstorm', 'Lightning', 'Snow', 'Rain', 'Hail', 'Fog', 'Tornado', 'Hurricane', 'Earthquake',
      'Sunset', 'Sunrise', 'Moon', 'Star', 'Comet', 'Waterfall', 'River', 'Lake', 'Ocean', 'Waves',
      'Forest', 'Rainforest', 'Desert', 'Glacier', 'Iceberg', 'Volcano', 'Mountain', 'Valley', 'Cliff', 'Cave',
      'Beach', 'Sand dune', 'Coral reef', 'Swamp', 'Meadow', 'Oak tree', 'Palm tree', 'Sunflower', 'Rose', 'Daisy',
      'Mushroom', 'Cactus', 'Moss', 'Pebble', 'Shell', 'Puddle', 'Icicle', 'Northern lights', 'Eclipse', 'Wind'
    ],
    'School & Office': [
      'Pencil', 'Pen', 'Rubber', 'Ruler', 'Sharpener', 'Notebook', 'Textbook', 'Calculator', 'Scissors', 'Glue stick',
      'Stapler', 'Paper clip', 'Highlighter', 'Whiteboard', 'Chalk', 'Blackboard', 'Desk', 'Chair', 'Backpack', 'Lunchbox',
      'Pencil case', 'Homework', 'Exam', 'Report card', 'Timetable', 'Classroom', 'Playground', 'Assembly', 'Detention', 'Field trip',
      'Laptop', 'Printer', 'Photocopier', 'Computer mouse', 'Keyboard', 'Email', 'Meeting', 'Coffee break', 'Filing cabinet', 'Name badge',
      'Calendar', 'Sticky note', 'Envelope', 'Folder', 'Projector', 'Microscope', 'Globe', 'Map', 'Dictionary', 'School bell'
    ],
    'Fantasy & Myth': [
      'Dragon', 'Unicorn', 'Wizard', 'Witch', 'Fairy', 'Mermaid', 'Vampire', 'Werewolf', 'Ghost', 'Zombie',
      'Troll', 'Goblin', 'Elf', 'Dwarf', 'Giant', 'Ogre', 'Phoenix', 'Griffin', 'Centaur', 'Minotaur',
      'Pegasus', 'Kraken', 'Yeti', 'Loch Ness Monster', 'Genie', 'Magic carpet', 'Magic wand', 'Crystal ball', 'Spell book', 'Potion',
      'Treasure chest', 'Pirate', 'Knight', 'Princess', 'King', 'Queen', 'Castle', 'Haunted house', 'Cauldron', 'Broomstick',
      'Sphinx', 'Cyclops', 'Medusa', 'Robot', 'Alien', 'Time machine', 'Invisibility cloak', 'Superhero', 'Leprechaun', 'Tooth fairy'
    ]
  };
});
