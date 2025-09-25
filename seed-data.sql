-- Seed sample data for Medishift testing
-- Create sample facility
INSERT INTO facilities (id, name, type, address) VALUES 
('facility-1', 'General Hospital', 'hospital', '123 Medical Center Dr, Healthcare City, HC 12345');

-- Create sample teams
INSERT INTO teams (id, name, description, facility_id) VALUES 
('team-1', 'Emergency Department', 'Emergency room nursing staff', 'facility-1'),
('team-2', 'ICU Unit', 'Intensive care nursing team', 'facility-1');

-- Create sample shift codes
INSERT INTO shift_codes (id, code, name, description, category, start_time, end_time, hours, color, border_color, facility_id) VALUES 
('code-1', 'M22', 'Morning Shift', 'Standard morning shift', 'shift', '06:00', '14:00', 8, '#FEF3C7', '#F59E0B', 'facility-1'),
('code-2', 'N11', 'Night Shift', 'Standard night shift', 'shift', '22:00', '06:00', 8, '#DBEAFE', '#3B82F6', 'facility-1'),
('code-3', 'AFW', 'Afternoon', 'Afternoon shift', 'shift', '14:00', '22:00', 8, '#D1FAE5', '#10B981', 'facility-1'),
('code-4', 'V02', 'Vacation', 'Vacation day', 'vacation', NULL, NULL, 0, '#E0E7FF', '#8B5CF6', 'facility-1'),
('code-5', 'L98', 'Training', 'Training/education day', 'training', '09:00', '17:00', 8, '#FDE68A', '#F59E0B', 'facility-1'),
('code-6', 'SK', 'Sick Leave', 'Sick leave day', 'sick_leave', NULL, NULL, 0, '#FEE2E2', '#EF4444', 'facility-1');