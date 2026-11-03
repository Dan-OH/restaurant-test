-- Optional sample data. Run after schema.sql.

with s as (
  insert into public.menu_sections (name, description, position) values
    ('Starters', 'Small plates to share', 0),
    ('Mains', 'Served with seasonal vegetables', 1),
    ('Desserts', null, 2)
  returning id, name
)
insert into public.menu_items (section_id, name, description, price, position)
select s.id, v.name, v.description, v.price, v.position
from s
join (values
  ('Starters', 'Garlic Bread', 'Sourdough, roasted garlic butter, parsley', 8.00, 0),
  ('Starters', 'Burrata', 'Heirloom tomatoes, basil oil, sea salt', 16.00, 1),
  ('Mains', 'Roast Chicken', 'Half chicken, lemon, thyme jus', 28.00, 0),
  ('Mains', 'Mushroom Risotto', 'Arborio, wild mushrooms, parmesan', 24.00, 1),
  ('Desserts', 'Chocolate Torte', 'Flourless, whipped cream', 11.00, 0)
) as v(section, name, description, price, position) on v.section = s.name;
