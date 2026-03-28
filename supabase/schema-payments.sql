-- ============================================
-- LOCOMOTIVE LMS - Phase 6: Payments & Access
-- Run this in Supabase SQL Editor
-- ============================================

-- ===== 1. Extend courses table =====
ALTER TABLE public.courses
    ADD COLUMN IF NOT EXISTS expiry_date date,
    ADD COLUMN IF NOT EXISTS is_installment boolean DEFAULT false;

-- ===== 2. COURSE SECTIONS (payment units) =====
CREATE TABLE IF NOT EXISTS public.course_sections (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id text REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    section_number int NOT NULL,
    price numeric(10,2) NOT NULL DEFAULT 0,
    currency text NOT NULL DEFAULT 'EUR',
    sort_order int DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.course_sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Sections are publicly readable" ON public.course_sections;
CREATE POLICY "Sections are publicly readable" ON public.course_sections FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage sections" ON public.course_sections;
CREATE POLICY "Admins can manage sections" ON public.course_sections FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- ===== 3. SECTION → MODULE MAPPING =====
CREATE TABLE IF NOT EXISTS public.section_module_map (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    section_id uuid REFERENCES public.course_sections(id) ON DELETE CASCADE NOT NULL,
    module_id text REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL,
    UNIQUE(section_id, module_id)
);

ALTER TABLE public.section_module_map ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Section map is publicly readable" ON public.section_module_map;
CREATE POLICY "Section map is publicly readable" ON public.section_module_map FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage section map" ON public.section_module_map;
CREATE POLICY "Admins can manage section map" ON public.section_module_map FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- ===== 4. COUPONS =====
CREATE TABLE IF NOT EXISTS public.coupons (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    code text UNIQUE NOT NULL,
    type text CHECK (type IN ('percentage', 'fixed')) NOT NULL,
    value numeric(10,2) NOT NULL,
    max_uses int,
    uses_count int DEFAULT 0,
    expires_at timestamptz,
    is_active boolean DEFAULT true,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Active coupons readable by auth users" ON public.coupons;
CREATE POLICY "Active coupons readable by auth users" ON public.coupons
    FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);
DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
CREATE POLICY "Admins can manage coupons" ON public.coupons FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- ===== 5. PAYMENTS (ledger) =====
CREATE TABLE IF NOT EXISTS public.payments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    section_id uuid REFERENCES public.course_sections(id) ON DELETE SET NULL,
    amount numeric(10,2) NOT NULL,
    currency text NOT NULL DEFAULT 'EUR',
    status text CHECK (status IN ('pending', 'paid', 'failed', 'refunded')) NOT NULL DEFAULT 'pending',
    paypal_order_id text,
    paypal_subscription_id text,
    coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL,
    discount_amount numeric(10,2) DEFAULT 0,
    notes text,
    created_at timestamptz DEFAULT now(),
    paid_at timestamptz,
    refunded_at timestamptz
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own payments" ON public.payments;
CREATE POLICY "Users can insert own payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
CREATE POLICY "Admins can view all payments" ON public.payments FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- ===== 6. STUDENT SECTION ACCESS (source of truth) =====
CREATE TABLE IF NOT EXISTS public.student_section_access (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    section_id uuid REFERENCES public.course_sections(id) ON DELETE CASCADE NOT NULL,
    payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
    status text CHECK (status IN ('active', 'free_grant', 'refunded')) NOT NULL DEFAULT 'active',
    granted_by_admin boolean DEFAULT false,
    notes text,
    granted_at timestamptz DEFAULT now(),
    UNIQUE(user_id, section_id)
);

ALTER TABLE public.student_section_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own access" ON public.student_section_access;
CREATE POLICY "Users can view own access" ON public.student_section_access FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own access" ON public.student_section_access;
CREATE POLICY "Users can insert own access" ON public.student_section_access FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can manage all access" ON public.student_section_access;
CREATE POLICY "Admins can manage all access" ON public.student_section_access FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- ===== 7. Add is_admin to profiles (if not exists) =====
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;
