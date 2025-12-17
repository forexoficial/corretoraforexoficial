-- Remove duplicated legal documents (keeping the ones with hyphenated slugs)
DELETE FROM legal_documents WHERE slug = 'politica-privacidade';
DELETE FROM legal_documents WHERE slug = 'politica-cookies';