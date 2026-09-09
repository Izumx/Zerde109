INSERT INTO regions (code, name_ru, name_kk, is_active) VALUES
  ('akmola',            'Акмолинская область',            'Ақмола облысы',              true),
  ('almaty',            'Алматинская область',            'Алматы облысы',              true),
  ('east-kazakhstan',   'Восточно-Казахстанская область', 'Шығыс Қазақстан облысы',     true),
  ('karaganda',         'Карагандинская область',         'Қарағанды облысы',           true),
  ('kostanay',          'Костанайская область',           'Қостанай облысы',            true),
  ('turkestan',         'Туркестанская область',          'Түркістан облысы',           true),
  ('pavlodar',          'Павлодарская область',           'Павлодар облысы',            true),
  ('abai',              'Область Абай',                   'Абай облысы',                false),
  ('aktobe',            'Актюбинская область',            'Ақтөбе облысы',              false),
  ('almaty-city',       'город Алматы',                   'Алматы қаласы',              false),
  ('astana',            'город Астана',                   'Астана қаласы',              false),
  ('atyrau',            'Атырауская область',             'Атырау облысы',              false),
  ('jambyl',            'Жамбылская область',             'Жамбыл облысы',              false),
  ('jetisu',            'Область Жетісу',                 'Жетісу облысы',              false),
  ('kyzylorda',         'Кызылординская область',         'Қызылорда облысы',           false),
  ('mangystau',         'Мангистауская область',          'Маңғыстау облысы',           false),
  ('north-kazakhstan',  'Северо-Казахстанская область',   'Солтүстік Қазақстан облысы', false),
  ('shymkent-city',     'город Шымкент',                  'Шымкент қаласы',             false),
  ('ulytau',            'Область Ұлытау',                 'Ұлытау облысы',              false),
  ('west-kazakhstan',   'Западно-Казахстанская область',  'Батыс Қазақстан облысы',     false)
ON CONFLICT (code) DO UPDATE
  SET name_ru = EXCLUDED.name_ru, name_kk = EXCLUDED.name_kk, is_active = EXCLUDED.is_active;
