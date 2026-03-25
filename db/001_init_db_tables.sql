-- =============================================================================
-- 001_init_db_tables.sql
-- Consolidated schema for ERP (Elysium Rising MMORPG)
-- Generated from live database on 2026-03-15
-- =============================================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: enforce_inventory_slot_cap(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_inventory_slot_cap() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

DECLARE stored_count INTEGER;

BEGIN

    IF NEW.is_equipped = FALSE OR NEW.is_equipped IS NULL THEN

        SELECT COUNT(*) INTO stored_count FROM player_inventory

        WHERE character_id = NEW.character_id

          AND (is_equipped = FALSE OR is_equipped IS NULL)

          AND marketplace_listing_id IS NULL;

        IF stored_count >= 10 THEN

            RAISE EXCEPTION 'Inventory full: maximum 10 stored items per character.' USING ERRCODE = 'check_violation';

        END IF;

    END IF;

    RETURN NEW;

END;

$$;


--
-- Name: trg_asset_registry_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_asset_registry_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    NEW.updated_at = NOW();

    RETURN NEW;

END;

$$;


--
-- Name: trg_player_subscriptions_updated_at_fn(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_player_subscriptions_updated_at_fn() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    NEW.updated_at = NOW();

    RETURN NEW;

END;

$$;


--
-- Name: update_achievements_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_achievements_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    NEW.updated_at = NOW();

    RETURN NEW;

END;

$$;


--
-- Name: update_curated_artifacts_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_curated_artifacts_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    NEW.updated_at = NOW();

    RETURN NEW;

END;

$$;


--
-- Name: update_item_prefixes_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_item_prefixes_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    NEW.updated_at = NOW();

    RETURN NEW;

END;

$$;


--
-- Name: update_item_suffixes_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_item_suffixes_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    NEW.updated_at = NOW();

    RETURN NEW;

END;

$$;


--
-- Name: update_item_type_bases_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_item_type_bases_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    NEW.updated_at = NOW();

    RETURN NEW;

END;

$$;


--
-- Name: update_shard_packages_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_shard_packages_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    NEW.updated_at = NOW();

    RETURN NEW;

END;

$$;


--
-- Name: update_timestamp_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_timestamp_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    NEW.updated_at = NOW();

    RETURN NEW;

END;

$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    NEW.updated_at = CURRENT_TIMESTAMP;

    RETURN NEW;

END;

$$;


SET default_table_access_method = heap;

--
-- Name: achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.achievements (
    id integer NOT NULL,
    name character varying(150) NOT NULL,
    description text NOT NULL,
    category character varying(20) NOT NULL,
    icon_sprite_key character varying(100) DEFAULT 'achievement_default'::character varying NOT NULL,
    tracking_type character varying(20) NOT NULL,
    tracking_source character varying(100) NOT NULL,
    threshold_value numeric(15,2) DEFAULT 1 NOT NULL,
    parent_achievement_id integer,
    reward_shards integer DEFAULT 0 NOT NULL,
    reward_essence integer DEFAULT 0 NOT NULL,
    reward_title_id integer,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT achievements_category_check CHECK (((category)::text = ANY (ARRAY[('combat'::character varying)::text, ('narrative'::character varying)::text, ('economics'::character varying)::text, ('idle'::character varying)::text, ('discovery'::character varying)::text]))),
    CONSTRAINT achievements_tracking_type_check CHECK (((tracking_type)::text = ANY (ARRAY[('cumulative'::character varying)::text, ('threshold'::character varying)::text, ('boolean'::character varying)::text])))
);


--
-- Name: achievements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.achievements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: achievements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.achievements_id_seq OWNED BY public.achievements.id;


--
-- Name: activity_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_events (
    id bigint NOT NULL,
    player_id integer,
    event_type character varying(50) NOT NULL,
    event_data jsonb,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: activity_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.activity_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: activity_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.activity_events_id_seq OWNED BY public.activity_events.id;


--
-- Name: admin_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_audit_log (
    id bigint NOT NULL,
    admin_email character varying(255) NOT NULL,
    action character varying(50) NOT NULL,
    target_type character varying(50),
    target_id character varying(100),
    details jsonb,
    ip_address character varying(45),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: admin_audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_audit_log_id_seq OWNED BY public.admin_audit_log.id;


--
-- Name: admin_essence_adjustments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_essence_adjustments (
    id integer NOT NULL,
    character_id integer NOT NULL,
    player_id integer NOT NULL,
    admin_email character varying(255) NOT NULL,
    adjustment_type character varying(10) NOT NULL,
    amount double precision NOT NULL,
    balance_before double precision NOT NULL,
    balance_after double precision NOT NULL,
    reason character varying(500) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT admin_essence_adjustments_adjustment_type_check CHECK (((adjustment_type)::text = ANY (ARRAY[('grant'::character varying)::text, ('debit'::character varying)::text]))),
    CONSTRAINT admin_essence_adjustments_amount_check CHECK ((amount > (0)::double precision))
);


--
-- Name: admin_essence_adjustments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_essence_adjustments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_essence_adjustments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_essence_adjustments_id_seq OWNED BY public.admin_essence_adjustments.id;


--
-- Name: admin_shard_adjustments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_shard_adjustments (
    id integer NOT NULL,
    player_id integer NOT NULL,
    admin_email character varying(255) NOT NULL,
    adjust_type character varying(10) NOT NULL,
    amount integer NOT NULL,
    reason text NOT NULL,
    balance_before bigint NOT NULL,
    balance_after bigint NOT NULL,
    shard_txn_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT admin_shard_adjustments_adjust_type_check CHECK (((adjust_type)::text = ANY (ARRAY[('grant'::character varying)::text, ('debit'::character varying)::text]))),
    CONSTRAINT admin_shard_adjustments_amount_check CHECK ((amount > 0))
);


--
-- Name: admin_shard_adjustments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_shard_adjustments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_shard_adjustments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_shard_adjustments_id_seq OWNED BY public.admin_shard_adjustments.id;


--
-- Name: admin_whitelist_emails; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_whitelist_emails (
    email character varying(255) NOT NULL,
    added_by character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: admin_whitelist_ips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_whitelist_ips (
    ip_address character varying(45) NOT NULL,
    note character varying(255),
    added_by character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: artifact_prefixes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.artifact_prefixes (
    id integer NOT NULL,
    code character varying(8) NOT NULL,
    display_name character varying(50) NOT NULL,
    stat_bonuses jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: artifact_prefixes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.artifact_prefixes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: artifact_prefixes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.artifact_prefixes_id_seq OWNED BY public.artifact_prefixes.id;


--
-- Name: artifact_suffixes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.artifact_suffixes (
    id integer NOT NULL,
    code character varying(8) NOT NULL,
    display_name character varying(100) NOT NULL,
    stat_bonuses jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: artifact_suffixes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.artifact_suffixes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: artifact_suffixes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.artifact_suffixes_id_seq OWNED BY public.artifact_suffixes.id;


--
-- Name: artifact_type_bases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.artifact_type_bases (
    id integer NOT NULL,
    code character varying(8) NOT NULL,
    display_name character varying(50) NOT NULL,
    base_stat_range jsonb NOT NULL,
    lore_reference text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: artifact_type_bases_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.artifact_type_bases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: artifact_type_bases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.artifact_type_bases_id_seq OWNED BY public.artifact_type_bases.id;


--
-- Name: artifacts_legacy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.artifacts_legacy (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    lore_text text,
    rarity character varying(50) DEFAULT 'rare'::character varying,
    passive_bonus jsonb DEFAULT '{}'::jsonb,
    sprite_key character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: artifacts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.artifacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: artifacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.artifacts_id_seq OWNED BY public.artifacts_legacy.id;


--
-- Name: animation_styles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.animation_styles (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    idle_scale_x real DEFAULT 1.0,
    idle_scale_y real DEFAULT 1.0,
    idle_cycle_ms integer DEFAULT 2000,
    idle_translate_x real DEFAULT 0,
    idle_translate_y real DEFAULT 0,
    attack_recoil real DEFAULT 3.0,
    death_style text DEFAULT 'fade'::text,
    death_duration_ms integer DEFAULT 400,
    death_particle_count integer DEFAULT 8,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: animation_styles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.animation_styles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: animation_styles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.animation_styles_id_seq OWNED BY public.animation_styles.id;


--
-- Name: armor_classes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.armor_classes (
    id integer NOT NULL,
    code text NOT NULL,
    display_name text NOT NULL,
    description text,
    overlay_opacity real DEFAULT 0.6,
    color_tint_base text,
    texture_pattern text DEFAULT 'solid'::text,
    glow_intensity real DEFAULT 0,
    outline_width real DEFAULT 1.0,
    weight_class text DEFAULT 'medium'::text,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: armor_classes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.armor_classes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: armor_classes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.armor_classes_id_seq OWNED BY public.armor_classes.id;


--
-- Name: asset_registry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_registry (
    id integer NOT NULL,
    asset_key character varying(150) NOT NULL,
    category character varying(50) NOT NULL,
    display_name character varying(200),
    description text,
    render_definition jsonb DEFAULT '{}'::jsonb NOT NULL,
    tags jsonb DEFAULT '[]'::jsonb NOT NULL,
    source character varying(50) DEFAULT 'admin'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: asset_registry_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.asset_registry_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: asset_registry_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.asset_registry_id_seq OWNED BY public.asset_registry.id;


--
-- Name: atmospheres; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.atmospheres (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    archetype character varying(100),
    description text,
    music_definitions jsonb DEFAULT '{"boss": null, "combat": null, "explore": null, "mystery": null}'::jsonb,
    generator_bpm integer DEFAULT 120,
    generator_key character varying(10) DEFAULT 'C'::character varying,
    generator_scale character varying(50) DEFAULT 'minor'::character varying,
    generator_complexity integer DEFAULT 5,
    generator_seed integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: atmospheres_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.atmospheres_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: atmospheres_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.atmospheres_id_seq OWNED BY public.atmospheres.id;


--
-- Name: attack_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attack_types (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    display_name character varying(100) NOT NULL,
    description text,
    is_physical boolean DEFAULT false,
    lore_reference text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    visual_behavior_id integer,
    stat_multipliers jsonb,
    attack_animation_type text DEFAULT 'melee_swing'::text,
    projectile_sprite_key text,
    projectile_speed real DEFAULT 3.0,
    projectile_color text,
    impact_effect text DEFAULT 'flash'::text,
    attack_range real DEFAULT 30.0,
    cooldown_ms integer DEFAULT 2000,
    arc_angle real DEFAULT 90,
    trail_type text,
    screen_shake boolean DEFAULT false
);


--
-- Name: attack_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.attack_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: attack_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.attack_types_id_seq OWNED BY public.attack_types.id;


--
-- Name: audio_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audio_configs (
    id integer NOT NULL,
    config_key character varying(100) NOT NULL,
    category character varying(50) DEFAULT 'sfx'::character varying NOT NULL,
    display_name character varying(100),
    preset_definition jsonb DEFAULT '{}'::jsonb NOT NULL,
    base_volume double precision DEFAULT 1.0,
    pitch_variation double precision DEFAULT 0.0,
    spatial_enabled boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: audio_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audio_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audio_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audio_configs_id_seq OWNED BY public.audio_configs.id;


--
-- Name: backgrounds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backgrounds (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    background_key character varying(100) NOT NULL,
    parallax_config jsonb DEFAULT '{}'::jsonb,
    time_of_day character varying(50),
    mood character varying(50),
    color_palette jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: backgrounds_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.backgrounds_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: backgrounds_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.backgrounds_id_seq OWNED BY public.backgrounds.id;


--
-- Name: benefit_effect_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.benefit_effect_data (
    id integer NOT NULL,
    effect_key character varying(100) NOT NULL,
    display_name character varying(100) NOT NULL,
    description text,
    value_type character varying(50) NOT NULL,
    min_value numeric,
    max_value numeric,
    category character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: benefit_effect_data_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.benefit_effect_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: benefit_effect_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.benefit_effect_data_id_seq OWNED BY public.benefit_effect_data.id;


--
-- Name: books; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.books (
    id integer NOT NULL,
    book_number integer NOT NULL,
    title character varying(255) NOT NULL,
    source_file character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    transition_lore_text text,
    recommended_level integer,
    min_level integer,
    atmosphere_id integer,
    difficulty_curve_id integer
);


--
-- Name: books_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.books_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: books_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.books_id_seq OWNED BY public.books.id;


--
-- Name: boss_completions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.boss_completions (
    id integer NOT NULL,
    player_id integer NOT NULL,
    scene_id integer NOT NULL,
    boss_type text NOT NULL,
    chapter_id integer,
    book_id integer,
    session_id text,
    completed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT boss_completions_boss_type_check CHECK ((boss_type = ANY (ARRAY['chapter_boss'::text, 'book_boss'::text])))
);


--
-- Name: boss_completions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.boss_completions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: boss_completions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.boss_completions_id_seq OWNED BY public.boss_completions.id;


--
-- Name: player_story_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_story_sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    player_id integer NOT NULL,
    scene_id integer,
    chapter_id integer,
    current_zone integer DEFAULT 1,
    current_wave integer DEFAULT 1,
    session_gold numeric DEFAULT 0,
    dark_ritual_multiplier numeric DEFAULT 1.0,
    audio_progress_pct numeric DEFAULT 0,
    required_waves_finished boolean DEFAULT false,
    audio_finished boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    narrative_progress_pct numeric DEFAULT 0,
    deaths integer DEFAULT 0 NOT NULL
);


--
-- Name: chapter_active_multipliers; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.chapter_active_multipliers AS
 SELECT player_id,
    chapter_id,
    max(dark_ritual_multiplier) AS max_ritual
   FROM public.player_story_sessions
  WHERE (is_active = true)
  GROUP BY player_id, chapter_id;


--
-- Name: chapters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chapters (
    id integer NOT NULL,
    book_id integer NOT NULL,
    chapter_number integer NOT NULL,
    title character varying(255),
    raw_text text,
    sort_order integer NOT NULL,
    processing_status character varying(50) DEFAULT 'not_started'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    transition_lore_text text,
    recommended_level integer,
    min_level integer,
    atmosphere_id integer
);


--
-- Name: chapters_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chapters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chapters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chapters_id_seq OWNED BY public.chapters.id;


--
-- Name: character_classes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.character_classes (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    lore_blurb text,
    base_strength integer DEFAULT 10,
    base_agility integer DEFAULT 10,
    base_intelligence integer DEFAULT 10,
    sprite_key character varying(100),
    is_available boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    visual_config jsonb
);


--
-- Name: character_classes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.character_classes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: character_classes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.character_classes_id_seq OWNED BY public.character_classes.id;


--
-- Name: character_skill_levels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.character_skill_levels (
    id integer NOT NULL,
    character_id integer NOT NULL,
    skill_id integer NOT NULL,
    level integer DEFAULT 1,
    current_xp numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    active_action_id integer,
    action_started_at timestamp with time zone,
    is_active_training boolean DEFAULT false NOT NULL,
    is_in_active_mode boolean DEFAULT false NOT NULL,
    active_mode_started_at timestamp with time zone,
    last_offline_calc_at timestamp with time zone,
    max_session_level integer DEFAULT 0 NOT NULL
);


--
-- Name: character_skill_levels_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.character_skill_levels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: character_skill_levels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.character_skill_levels_id_seq OWNED BY public.character_skill_levels.id;


--
-- Name: character_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.character_stats (
    id integer NOT NULL,
    character_id integer NOT NULL,
    stat_id integer NOT NULL,
    computed_total integer DEFAULT 0 NOT NULL,
    last_computed_at timestamp with time zone DEFAULT now()
);


--
-- Name: character_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.character_stats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: character_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.character_stats_id_seq OWNED BY public.character_stats.id;


--
-- Name: chat_channels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_channels (
    id character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    channel_type character varying(20) DEFAULT 'global'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by integer
);


--
-- Name: class_stat_affinities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.class_stat_affinities (
    id integer NOT NULL,
    class_id integer NOT NULL,
    stat_id integer NOT NULL,
    base_value integer DEFAULT 10 NOT NULL,
    lore_weight numeric(5,4) DEFAULT 0.0 NOT NULL,
    level_bonus_per_level numeric(5,4) DEFAULT 0.0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: class_stat_affinities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.class_stat_affinities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: class_stat_affinities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.class_stat_affinities_id_seq OWNED BY public.class_stat_affinities.id;


--
-- Name: curated_artifact_tiers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.curated_artifact_tiers (
    id integer NOT NULL,
    curated_artifact_id integer NOT NULL,
    rarity character varying(20) NOT NULL,
    stat_bonuses jsonb DEFAULT '{}'::jsonb NOT NULL,
    unique_effect_text text,
    drop_chance_multiplier numeric(6,4) DEFAULT 1.0 NOT NULL,
    CONSTRAINT curated_artifact_tiers_rarity_check CHECK (((rarity)::text = ANY (ARRAY[('common'::character varying)::text, ('uncommon'::character varying)::text, ('rare'::character varying)::text, ('epic'::character varying)::text, ('cosmic'::character varying)::text])))
);


--
-- Name: curated_artifact_tiers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.curated_artifact_tiers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: curated_artifact_tiers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.curated_artifact_tiers_id_seq OWNED BY public.curated_artifact_tiers.id;


--
-- Name: curated_artifacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.curated_artifacts (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text NOT NULL,
    lore_text text,
    icon_sprite_key character varying(100) NOT NULL,
    source_type character varying(20) NOT NULL,
    source_id integer,
    source_hint character varying(255) NOT NULL,
    base_drop_chance numeric(6,4) DEFAULT 0.01 NOT NULL,
    synergy_set_id integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT curated_artifacts_source_type_check CHECK (((source_type)::text = ANY (ARRAY[('boss'::character varying)::text, ('chapter'::character varying)::text, ('rare_spawn'::character varying)::text])))
);


--
-- Name: curated_artifacts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.curated_artifacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: curated_artifacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.curated_artifacts_id_seq OWNED BY public.curated_artifacts.id;


--
-- Name: dev_content_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dev_content_audit (
    id integer NOT NULL,
    audit_type character varying(50) NOT NULL,
    entity_type character varying(50),
    entity_id integer,
    entity_name character varying(255),
    missing_field character varying(100),
    scene_id integer,
    zone_level integer,
    logged_at timestamp with time zone DEFAULT now(),
    status character varying(20) DEFAULT 'open'::character varying NOT NULL
);


--
-- Name: dev_content_audit_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dev_content_audit_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dev_content_audit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dev_content_audit_id_seq OWNED BY public.dev_content_audit.id;


--
-- Name: difficulty_curves; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.difficulty_curves (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    curve_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: difficulty_curves_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.difficulty_curves_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: difficulty_curves_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.difficulty_curves_id_seq OWNED BY public.difficulty_curves.id;


--
-- Name: difficulty_presets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.difficulty_presets (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    difficulty_curve_id integer,
    wave_preset_id integer,
    config_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: difficulty_presets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.difficulty_presets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: difficulty_presets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.difficulty_presets_id_seq OWNED BY public.difficulty_presets.id;


--
-- Name: donations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.donations (
    id integer NOT NULL,
    player_id integer NOT NULL,
    payment_order_id integer NOT NULL,
    amount_cents integer NOT NULL,
    cumulative_total_cents integer DEFAULT 0 NOT NULL,
    patron_tier character varying(20) DEFAULT NULL::character varying,
    diamond_stars integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT donations_amount_cents_check CHECK ((amount_cents >= 100))
);


--
-- Name: donations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.donations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: donations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.donations_id_seq OWNED BY public.donations.id;


--
-- Name: entities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entities (
    id integer NOT NULL,
    canonical_name character varying(255) NOT NULL,
    is_generated boolean DEFAULT false,
    base_description text,
    base_emotional_state text,
    base_sounds text,
    base_smells text,
    base_equipment text,
    base_abilities text,
    boss_text_references text,
    boss_action_quote text,
    boss_variant_differences text,
    first_appearance_scene_id integer,
    ai_provider character varying(50),
    ai_model_id character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    entity_type_id integer NOT NULL,
    entity_family_id integer
);


--
-- Name: entities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.entities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: entities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.entities_id_seq OWNED BY public.entities.id;


--
-- Name: entity_aliases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entity_aliases (
    id integer NOT NULL,
    entity_id integer NOT NULL,
    alias character varying(255) NOT NULL,
    context text
);


--
-- Name: entity_aliases_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.entity_aliases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: entity_aliases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.entity_aliases_id_seq OWNED BY public.entity_aliases.id;


--
-- Name: entity_attack_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entity_attack_types (
    id integer NOT NULL,
    entity_id integer NOT NULL,
    attack_type_id integer NOT NULL,
    is_primary boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: entity_attack_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.entity_attack_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: entity_attack_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.entity_attack_types_id_seq OWNED BY public.entity_attack_types.id;


--
-- Name: entity_beat_appearances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entity_beat_appearances (
    id integer NOT NULL,
    entity_id integer NOT NULL,
    story_beat_id integer NOT NULL,
    role character varying(50),
    is_primary boolean DEFAULT false,
    beat_context text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: entity_beat_appearances_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.entity_beat_appearances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: entity_beat_appearances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.entity_beat_appearances_id_seq OWNED BY public.entity_beat_appearances.id;


--
-- Name: entity_families; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entity_families (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    display_name character varying(100) NOT NULL,
    description text,
    icon_key character varying(100),
    lore_reference text,
    base_stat_template jsonb,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: entity_families_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.entity_families_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: entity_families_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.entity_families_id_seq OWNED BY public.entity_families.id;


--
-- Name: entity_gameplay_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entity_gameplay_data (
    id integer NOT NULL,
    entity_id integer NOT NULL,
    sprite_key character varying(100),
    base_hp bigint DEFAULT 0,
    base_gold bigint DEFAULT 0,
    appearance_rate double precision DEFAULT 1.0,
    stat_block jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    unique_boss_theme_id integer,
    death_sfx_key character varying(100),
    movement_type_id integer,
    size_class_id integer,
    animation_style_id integer,
    silhouette_type_id integer,
    color_primary text,
    color_secondary text,
    primary_attack_type_id integer,
    secondary_attack_type_id integer,
    tertiary_attack_type_id integer
);


--
-- Name: entity_gameplay_data_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.entity_gameplay_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: entity_gameplay_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.entity_gameplay_data_id_seq OWNED BY public.entity_gameplay_data.id;


--
-- Name: entity_scene_appearances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entity_scene_appearances (
    id integer NOT NULL,
    entity_id integer NOT NULL,
    scene_id integer NOT NULL,
    role character varying(50),
    is_present boolean DEFAULT true,
    description_delta text,
    emotional_state_delta text,
    equipment_delta text,
    exit_reason character varying(255),
    entry_context text,
    relationships text,
    ai_provider character varying(50),
    ai_model_id character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: entity_scene_appearances_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.entity_scene_appearances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: entity_scene_appearances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.entity_scene_appearances_id_seq OWNED BY public.entity_scene_appearances.id;


--
-- Name: entity_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entity_types (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    display_name character varying(100) NOT NULL,
    description text,
    color_hex character varying(7),
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: entity_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.entity_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: entity_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.entity_types_id_seq OWNED BY public.entity_types.id;


--
-- Name: game_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.game_configs (
    key character varying(100) NOT NULL,
    value_json jsonb NOT NULL,
    description text,
    updated_at timestamp with time zone DEFAULT now(),
    category character varying(50) DEFAULT NULL::character varying,
    game_impact text,
    updated_by integer
);


--
-- Name: gear_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gear_slots (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    display_name character varying(100) NOT NULL,
    description text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    paperdoll_layer integer
);


--
-- Name: gear_slots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gear_slots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gear_slots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gear_slots_id_seq OWNED BY public.gear_slots.id;


--
-- Name: idle_skill_stat_contributions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.idle_skill_stat_contributions (
    id integer NOT NULL,
    idle_skill_id integer NOT NULL,
    stat_id integer NOT NULL,
    coefficient numeric(6,4) DEFAULT 0.5 NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: idle_skill_stat_contributions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.idle_skill_stat_contributions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: idle_skill_stat_contributions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.idle_skill_stat_contributions_id_seq OWNED BY public.idle_skill_stat_contributions.id;


--
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_items (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    item_type character varying(50) NOT NULL,
    rarity character varying(50) DEFAULT 'common'::character varying,
    base_stats jsonb DEFAULT '{}'::jsonb,
    sprite_key character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    item_code character varying(60) DEFAULT NULL::character varying,
    item_level integer DEFAULT 1 NOT NULL,
    min_char_level integer DEFAULT 1 NOT NULL,
    stat_requirements jsonb DEFAULT '{}'::jsonb NOT NULL,
    gear_slot_id integer,
    is_dream_item boolean DEFAULT false NOT NULL,
    acquired_from character varying(100) DEFAULT NULL::character varying
);


--
-- Name: inventory_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventory_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventory_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventory_items_id_seq OWNED BY public.inventory_items.id;


--
-- Name: item_lore_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_lore_tags (
    id integer NOT NULL,
    code character varying(8) NOT NULL,
    display_name character varying(50) NOT NULL,
    narrative_context text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: item_lore_tags_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_lore_tags_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_lore_tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_lore_tags_id_seq OWNED BY public.item_lore_tags.id;


--
-- Name: item_prefixes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_prefixes (
    id integer NOT NULL,
    code character varying(8) NOT NULL,
    display_name character varying(50) NOT NULL,
    stat_bonuses jsonb DEFAULT '{}'::jsonb NOT NULL,
    lore_reference text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: item_prefixes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_prefixes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_prefixes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_prefixes_id_seq OWNED BY public.item_prefixes.id;


--
-- Name: item_qualities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_qualities (
    id integer NOT NULL,
    code character varying(8) NOT NULL,
    display_name character varying(50) NOT NULL,
    lore_reference text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: item_qualities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_qualities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_qualities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_qualities_id_seq OWNED BY public.item_qualities.id;


--
-- Name: item_suffixes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_suffixes (
    id integer NOT NULL,
    code character varying(8) NOT NULL,
    display_name character varying(100) NOT NULL,
    stat_bonuses jsonb DEFAULT '{}'::jsonb NOT NULL,
    lore_reference text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: item_suffixes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_suffixes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_suffixes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_suffixes_id_seq OWNED BY public.item_suffixes.id;


--
-- Name: item_type_bases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_type_bases (
    id integer NOT NULL,
    code character varying(8) NOT NULL,
    display_name character varying(50) NOT NULL,
    gear_slot_id integer NOT NULL,
    base_stat_range jsonb DEFAULT '{}'::jsonb NOT NULL,
    lore_reference text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    armor_class_id integer,
    player_attack_animation text,
    player_projectile_key text
);


--
-- Name: item_type_bases_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.item_type_bases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: item_type_bases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.item_type_bases_id_seq OWNED BY public.item_type_bases.id;


--
-- Name: leaderboard_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leaderboard_cache (
    id integer NOT NULL,
    category character varying(20) NOT NULL,
    rank integer NOT NULL,
    player_id integer NOT NULL,
    player_alias character varying(100) NOT NULL,
    character_class character varying(50),
    character_level integer,
    equipped_title character varying(100),
    metric_value numeric(15,2) NOT NULL,
    badge_tier character varying(10),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT leaderboard_cache_badge_tier_check CHECK (((badge_tier)::text = ANY (ARRAY[('cosmic'::character varying)::text, ('gold'::character varying)::text, ('silver'::character varying)::text, ('bronze'::character varying)::text]))),
    CONSTRAINT leaderboard_cache_category_check CHECK (((category)::text = ANY (ARRAY[('vanguard'::character varying)::text, ('alchemist'::character varying)::text, ('swift'::character varying)::text, ('scholar'::character varying)::text])))
);


--
-- Name: leaderboard_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.leaderboard_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: leaderboard_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.leaderboard_cache_id_seq OWNED BY public.leaderboard_cache.id;


--
-- Name: location_aliases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.location_aliases (
    id integer NOT NULL,
    location_id integer NOT NULL,
    alias character varying(255) NOT NULL,
    context text
);


--
-- Name: location_aliases_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.location_aliases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: location_aliases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.location_aliases_id_seq OWNED BY public.location_aliases.id;


--
-- Name: location_scene_appearances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.location_scene_appearances (
    id integer NOT NULL,
    location_id integer NOT NULL,
    scene_id integer NOT NULL,
    visual_delta text,
    auditory_delta text,
    olfactory_delta text,
    tactile_delta text,
    atmosphere_delta text,
    ai_provider character varying(50),
    ai_model_id character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: location_scene_appearances_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.location_scene_appearances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: location_scene_appearances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.location_scene_appearances_id_seq OWNED BY public.location_scene_appearances.id;


--
-- Name: locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.locations (
    id integer NOT NULL,
    canonical_name character varying(255) NOT NULL,
    location_type character varying(50),
    base_visual text,
    base_auditory text,
    base_olfactory text,
    base_tactile text,
    base_atmosphere text,
    first_appearance_scene_id integer,
    ai_provider character varying(50),
    ai_model_id character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    archetype_id integer,
    description text
);


--
-- Name: locations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.locations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.locations_id_seq OWNED BY public.locations.id;


--
-- Name: marketplace_listings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketplace_listings (
    id integer NOT NULL,
    seller_id integer NOT NULL,
    buyer_id integer,
    item_type character varying(20) NOT NULL,
    item_ref_id integer NOT NULL,
    item_name character varying(150) NOT NULL,
    item_rarity character varying(50) NOT NULL,
    item_stats jsonb DEFAULT '{}'::jsonb NOT NULL,
    item_icon_key character varying(100),
    item_gear_slot integer,
    is_curated boolean DEFAULT false NOT NULL,
    price_shards integer NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    listed_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    sold_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    expired_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT marketplace_listings_item_type_check CHECK (((item_type)::text = ANY (ARRAY[('artifact'::character varying)::text, ('equipment'::character varying)::text]))),
    CONSTRAINT marketplace_listings_price_shards_check CHECK ((price_shards >= 1)),
    CONSTRAINT marketplace_listings_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('sold'::character varying)::text, ('expired'::character varying)::text, ('cancelled'::character varying)::text])))
);


--
-- Name: marketplace_listings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.marketplace_listings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: marketplace_listings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.marketplace_listings_id_seq OWNED BY public.marketplace_listings.id;


--
-- Name: marketplace_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketplace_notifications (
    id integer NOT NULL,
    player_id integer NOT NULL,
    notification_type character varying(30) NOT NULL,
    title character varying(200) NOT NULL,
    message text NOT NULL,
    related_listing_id integer,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    read_at timestamp with time zone,
    CONSTRAINT marketplace_notifications_type_check CHECK (((notification_type)::text = ANY (ARRAY[('item_sold'::character varying)::text, ('listing_expired'::character varying)::text, ('listing_removed'::character varying)::text])))
);


--
-- Name: marketplace_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.marketplace_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: marketplace_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.marketplace_notifications_id_seq OWNED BY public.marketplace_notifications.id;


--
-- Name: marketplace_price_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketplace_price_history (
    id integer NOT NULL,
    listing_id integer NOT NULL,
    price integer NOT NULL,
    old_price integer,
    action character varying(20) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT marketplace_price_history_action_check CHECK (((action)::text = ANY (ARRAY[('listed'::character varying)::text, ('adjusted'::character varying)::text])))
);


--
-- Name: marketplace_price_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.marketplace_price_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: marketplace_price_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.marketplace_price_history_id_seq OWNED BY public.marketplace_price_history.id;


--
-- Name: marketplace_trades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketplace_trades (
    id integer NOT NULL,
    listing_id integer NOT NULL,
    buyer_id integer NOT NULL,
    seller_id integer NOT NULL,
    item_type character varying(20) NOT NULL,
    item_ref_id integer NOT NULL,
    item_name character varying(150) NOT NULL,
    item_rarity character varying(50) NOT NULL,
    price_shards integer NOT NULL,
    tax_shards integer DEFAULT 0 NOT NULL,
    seller_proceeds integer NOT NULL,
    claim_status character varying(20) DEFAULT 'claimed'::character varying NOT NULL,
    traded_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT marketplace_trades_claim_status_check CHECK (((claim_status)::text = ANY (ARRAY[('claimed'::character varying)::text, ('pending'::character varying)::text, ('discarded'::character varying)::text, ('reversed'::character varying)::text]))),
    CONSTRAINT marketplace_trades_item_type_check CHECK (((item_type)::text = ANY (ARRAY[('artifact'::character varying)::text, ('equipment'::character varying)::text])))
);


--
-- Name: marketplace_trades_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.marketplace_trades_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: marketplace_trades_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.marketplace_trades_id_seq OWNED BY public.marketplace_trades.id;


--
-- Name: movement_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movement_types (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    y_offset_min real DEFAULT 0,
    y_offset_max real DEFAULT 0,
    bob_amplitude real DEFAULT 0,
    bob_frequency real DEFAULT 1.0,
    speed_multiplier real DEFAULT 1.0,
    can_change_lane boolean DEFAULT false,
    trail_effect text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: movement_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.movement_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: movement_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.movement_types_id_seq OWNED BY public.movement_types.id;


--
-- Name: payment_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_orders (
    id integer NOT NULL,
    player_id integer NOT NULL,
    package_id integer NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    stripe_checkout_session_id character varying(255),
    stripe_payment_intent_id character varying(255) DEFAULT NULL::character varying,
    stripe_charge_id character varying(255) DEFAULT NULL::character varying,
    idempotency_key uuid NOT NULL,
    price_cents integer NOT NULL,
    shards_credited integer DEFAULT 0,
    shards_refunded integer DEFAULT 0,
    is_first_purchase boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    refunded_at timestamp with time zone,
    expired_at timestamp with time zone,
    CONSTRAINT payment_orders_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('completed'::character varying)::text, ('expired'::character varying)::text, ('refunded'::character varying)::text, ('disputed'::character varying)::text])))
);


--
-- Name: payment_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payment_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payment_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payment_orders_id_seq OWNED BY public.payment_orders.id;


--
-- Name: player_achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_achievements (
    id integer NOT NULL,
    player_id integer NOT NULL,
    achievement_id integer NOT NULL,
    progress_value numeric(15,2) DEFAULT 0 NOT NULL,
    is_completed boolean DEFAULT false NOT NULL,
    is_new boolean DEFAULT true NOT NULL,
    earned_at timestamp with time zone
);


--
-- Name: player_achievements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.player_achievements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: player_achievements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.player_achievements_id_seq OWNED BY public.player_achievements.id;


--
-- Name: player_active_boosters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_active_boosters (
    id integer NOT NULL,
    player_id integer NOT NULL,
    boost_type character varying(20) NOT NULL,
    magnitude numeric(5,2) NOT NULL,
    duration_seconds integer NOT NULL,
    elapsed_seconds integer DEFAULT 0 NOT NULL,
    shop_item_id integer,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    activated_at timestamp with time zone DEFAULT now() NOT NULL,
    expired_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT player_active_boosters_boost_type_check CHECK (((boost_type)::text = ANY (ARRAY[('xp'::character varying)::text, ('essence'::character varying)::text, ('drop_rate'::character varying)::text]))),
    CONSTRAINT player_active_boosters_duration_seconds_check CHECK ((duration_seconds > 0)),
    CONSTRAINT player_active_boosters_elapsed_seconds_check CHECK ((elapsed_seconds >= 0)),
    CONSTRAINT player_active_boosters_magnitude_check CHECK ((magnitude > 1.0)),
    CONSTRAINT player_active_boosters_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('expired'::character varying)::text])))
);


--
-- Name: player_active_boosters_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.player_active_boosters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: player_active_boosters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.player_active_boosters_id_seq OWNED BY public.player_active_boosters.id;


--
-- Name: player_artifacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_artifacts (
    id integer NOT NULL,
    player_id integer NOT NULL,
    character_id integer NOT NULL,
    artifact_type character varying(20) NOT NULL,
    curated_artifact_id integer,
    artifact_code character varying(60),
    name character varying(150) NOT NULL,
    rarity character varying(20) NOT NULL,
    icon_sprite_key character varying(100) DEFAULT 'artifact_default'::character varying NOT NULL,
    stat_bonuses jsonb DEFAULT '{}'::jsonb NOT NULL,
    acquired_from character varying(100),
    is_new boolean DEFAULT true NOT NULL,
    acquired_at timestamp with time zone DEFAULT now() NOT NULL,
    marketplace_listing_id integer,
    CONSTRAINT player_artifacts_artifact_type_check CHECK (((artifact_type)::text = ANY (ARRAY[('curated'::character varying)::text, ('generated'::character varying)::text]))),
    CONSTRAINT player_artifacts_rarity_check CHECK (((rarity)::text = ANY (ARRAY[('common'::character varying)::text, ('uncommon'::character varying)::text, ('rare'::character varying)::text, ('epic'::character varying)::text, ('cosmic'::character varying)::text])))
);


--
-- Name: player_artifacts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.player_artifacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: player_artifacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.player_artifacts_id_seq OWNED BY public.player_artifacts.id;


--
-- Name: player_characters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_characters (
    id integer NOT NULL,
    player_id integer NOT NULL,
    class_id integer NOT NULL,
    character_name character varying(20) NOT NULL,
    level integer DEFAULT 1,
    strength integer,
    agility integer,
    intelligence integer,
    created_at timestamp with time zone DEFAULT now(),
    last_played_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    character_xp bigint DEFAULT 0 NOT NULL,
    equipped_title_id integer,
    equipped_skin_id integer
);


--
-- Name: player_characters_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.player_characters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: player_characters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.player_characters_id_seq OWNED BY public.player_characters.id;


--
-- Name: player_collections_legacy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_collections_legacy (
    id integer NOT NULL,
    character_id integer NOT NULL,
    artifact_id integer NOT NULL,
    unlocked_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: player_collections_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.player_collections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: player_collections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.player_collections_id_seq OWNED BY public.player_collections_legacy.id;


--
-- Name: player_discovery_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_discovery_log (
    id integer NOT NULL,
    player_id integer NOT NULL,
    discovery_type character varying(20) NOT NULL,
    reference_id integer NOT NULL,
    discovered_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_new boolean DEFAULT true NOT NULL
);


--
-- Name: player_discovery_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.player_discovery_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: player_discovery_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.player_discovery_log_id_seq OWNED BY public.player_discovery_log.id;


--
-- Name: player_entity_discovery; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_entity_discovery (
    id integer NOT NULL,
    player_id integer NOT NULL,
    entity_id integer NOT NULL,
    encounters integer DEFAULT 0 NOT NULL,
    kills integer DEFAULT 0 NOT NULL,
    rank character varying(2) DEFAULT NULL::character varying,
    first_seen_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_new boolean DEFAULT true NOT NULL
);


--
-- Name: player_entity_discovery_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.player_entity_discovery_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: player_entity_discovery_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.player_entity_discovery_id_seq OWNED BY public.player_entity_discovery.id;


--
-- Name: player_essence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_essence (
    id integer NOT NULL,
    player_id integer NOT NULL,
    character_id integer NOT NULL,
    current_balance numeric(20,4) DEFAULT 0 NOT NULL,
    passive_rate numeric(20,4) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: player_essence_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.player_essence_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: player_essence_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.player_essence_id_seq OWNED BY public.player_essence.id;


--
-- Name: player_inventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_inventory (
    id integer NOT NULL,
    character_id integer NOT NULL,
    item_id integer NOT NULL,
    is_equipped boolean DEFAULT false,
    equipped_slot character varying(50),
    quantity integer DEFAULT 1,
    acquired_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    marketplace_listing_id integer
);


--
-- Name: player_inventory_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.player_inventory_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: player_inventory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.player_inventory_id_seq OWNED BY public.player_inventory.id;


--
-- Name: player_meta_progression; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_meta_progression (
    player_id integer NOT NULL,
    elysium_essence numeric DEFAULT 0,
    total_essence_earned numeric DEFAULT 0,
    spent_essence numeric DEFAULT 0,
    updated_at timestamp with time zone DEFAULT now(),
    shard_balance bigint DEFAULT 0 NOT NULL,
    total_shards_earned bigint DEFAULT 0 NOT NULL,
    active_training_sessions integer DEFAULT 0 NOT NULL
);


--
-- Name: player_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_progress (
    id integer NOT NULL,
    player_id integer NOT NULL,
    character_id integer NOT NULL,
    book_number integer DEFAULT 1 NOT NULL,
    chapter_number integer DEFAULT 1 NOT NULL,
    scene_number integer DEFAULT 1 NOT NULL,
    beat_number integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: player_progress_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.player_progress_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: player_progress_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.player_progress_id_seq OWNED BY public.player_progress.id;


--
-- Name: player_scene_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_scene_records (
    id integer NOT NULL,
    player_id integer NOT NULL,
    scene_id integer NOT NULL,
    best_wave integer DEFAULT 0 NOT NULL,
    best_time_seconds integer,
    total_enemies_killed bigint DEFAULT 0 NOT NULL,
    total_runs integer DEFAULT 0 NOT NULL,
    first_completed_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now(),
    total_damage_dealt bigint DEFAULT 0 NOT NULL,
    best_session_damage bigint DEFAULT 0 NOT NULL
);


--
-- Name: player_scene_records_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.player_scene_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: player_scene_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.player_scene_records_id_seq OWNED BY public.player_scene_records.id;


--
-- Name: player_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_settings (
    id integer NOT NULL,
    player_id integer NOT NULL,
    audio_enabled boolean DEFAULT true,
    music_volume smallint DEFAULT 80,
    sfx_volume smallint DEFAULT 80,
    narration_speed numeric(2,1) DEFAULT 1.0,
    updated_at timestamp with time zone DEFAULT now(),
    narration_wpm integer DEFAULT 200,
    narration_font_size integer DEFAULT 14,
    narration_block_height integer DEFAULT 50,
    ui_scale double precision DEFAULT 1.0,
    game_text_scale double precision DEFAULT 1.0,
    master_volume smallint DEFAULT 80,
    master_muted boolean DEFAULT false,
    chat_muted boolean DEFAULT false NOT NULL,
    chat_muted_until character varying(50) DEFAULT NULL::character varying,
    akashic_last_visited_at timestamp with time zone,
    gallery_last_visited_at timestamp with time zone,
    achievements_last_visited_at timestamp with time zone,
    CONSTRAINT player_settings_master_volume_check CHECK (((master_volume >= 0) AND (master_volume <= 100))),
    CONSTRAINT player_settings_music_volume_check CHECK (((music_volume >= 0) AND (music_volume <= 100))),
    CONSTRAINT player_settings_narration_speed_check CHECK (((narration_speed >= 0.5) AND (narration_speed <= 2.0))),
    CONSTRAINT player_settings_sfx_volume_check CHECK (((sfx_volume >= 0) AND (sfx_volume <= 100)))
);


--
-- Name: player_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.player_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: player_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.player_settings_id_seq OWNED BY public.player_settings.id;


--
-- Name: player_shop_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_shop_items (
    id integer NOT NULL,
    player_id integer NOT NULL,
    shop_item_id integer,
    source_bundle_id integer,
    status character varying(20) DEFAULT 'owned'::character varying NOT NULL,
    purchased_at timestamp with time zone DEFAULT now() NOT NULL,
    refunded_at timestamp with time zone,
    CONSTRAINT player_shop_items_status_check CHECK (((status)::text = ANY (ARRAY[('owned'::character varying)::text, ('refunded'::character varying)::text])))
);


--
-- Name: player_shop_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.player_shop_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: player_shop_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.player_shop_items_id_seq OWNED BY public.player_shop_items.id;


--
-- Name: player_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_subscriptions (
    id integer NOT NULL,
    player_id integer NOT NULL,
    stripe_subscription_id character varying(255) DEFAULT NULL::character varying,
    stripe_price_id character varying(255) DEFAULT NULL::character varying,
    plan_key character varying(30) NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    source character varying(20) DEFAULT 'stripe'::character varying NOT NULL,
    subscription_start_date timestamp with time zone DEFAULT now() NOT NULL,
    current_period_start timestamp with time zone NOT NULL,
    current_period_end timestamp with time zone NOT NULL,
    cancel_at_period_end boolean DEFAULT false NOT NULL,
    continuous_streak integer DEFAULT 0 NOT NULL,
    grace_period_start timestamp with time zone,
    grace_deadline timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT player_subscriptions_source_check CHECK (((source)::text = ANY (ARRAY[('stripe'::character varying)::text, ('admin_gift'::character varying)::text]))),
    CONSTRAINT player_subscriptions_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('past_due'::character varying)::text, ('canceling'::character varying)::text, ('expired'::character varying)::text])))
);


--
-- Name: player_subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.player_subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: player_subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.player_subscriptions_id_seq OWNED BY public.player_subscriptions.id;


--
-- Name: player_titles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_titles (
    id integer NOT NULL,
    player_id integer NOT NULL,
    title_id integer NOT NULL,
    earned_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: player_titles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.player_titles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: player_titles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.player_titles_id_seq OWNED BY public.player_titles.id;


--
-- Name: players; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.players (
    id integer NOT NULL,
    firebase_uid character varying(128) NOT NULL,
    email character varying(255) NOT NULL,
    google_display_name character varying(255),
    google_avatar_url text,
    alias character varying(20),
    custom_avatar_url text,
    avatar_preset_key character varying(50),
    terms_accepted_at timestamp with time zone,
    is_banned boolean DEFAULT false,
    banned_at timestamp with time zone,
    banned_by character varying(255),
    ban_reason text,
    created_at timestamp with time zone DEFAULT now(),
    last_login_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    sessions_invalid_before timestamp with time zone,
    is_owner boolean DEFAULT false,
    is_system_admin boolean DEFAULT false,
    is_game_admin boolean DEFAULT false,
    stripe_customer_id character varying(255) DEFAULT NULL::character varying,
    first_purchase_claimed boolean DEFAULT false NOT NULL,
    account_flag character varying(30) DEFAULT NULL::character varying,
    is_ascendant boolean DEFAULT false NOT NULL,
    cumulative_subscription_months integer DEFAULT 0 NOT NULL,
    equipped_flair_id integer,
    equipped_badge_id integer,
    equipped_avatar_id integer,
    cumulative_donation_cents integer DEFAULT 0 NOT NULL,
    patron_tier character varying(20) DEFAULT NULL::character varying,
    patron_diamond_stars integer DEFAULT 0 NOT NULL,
    donor_visibility boolean DEFAULT false NOT NULL,
    marketplace_slots_purchased integer DEFAULT 0 NOT NULL
);


--
-- Name: players_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.players_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: players_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.players_id_seq OWNED BY public.players.id;


--
-- Name: processing_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.processing_runs (
    id integer NOT NULL,
    book_id integer NOT NULL,
    phase integer NOT NULL,
    started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    ended_at timestamp with time zone,
    status character varying(50) DEFAULT 'running'::character varying,
    last_completed_chapter_id integer,
    claude_tokens_used bigint DEFAULT 0,
    gemini_tokens_used bigint DEFAULT 0,
    error_message text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: processing_runs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.processing_runs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: processing_runs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.processing_runs_id_seq OWNED BY public.processing_runs.id;


--
-- Name: review_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_items (
    id integer NOT NULL,
    category character varying(50) NOT NULL,
    severity character varying(20) DEFAULT 'info'::character varying,
    title character varying(500) NOT NULL,
    description text,
    suggested_action text,
    affected_entity_id integer,
    affected_location_id integer,
    affected_scene_id integer,
    affected_beat_id integer,
    review_status character varying(50) DEFAULT 'pending_review'::character varying,
    reviewer_notes text,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: review_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.review_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: review_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.review_items_id_seq OWNED BY public.review_items.id;


--
-- Name: scene_audio_sync; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scene_audio_sync (
    id integer NOT NULL,
    scene_id integer NOT NULL,
    timestamp_seconds integer NOT NULL,
    asset_key character varying(255) NOT NULL,
    paragraph_index integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: scene_audio_sync_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.scene_audio_sync_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: scene_audio_sync_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.scene_audio_sync_id_seq OWNED BY public.scene_audio_sync.id;


--
-- Name: scene_gameplay_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scene_gameplay_data (
    id integer NOT NULL,
    scene_id integer NOT NULL,
    required_time_seconds integer DEFAULT 300 NOT NULL,
    background_sprite_key character varying(100),
    is_boss_scene boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    atmosphere_id integer,
    background_id integer,
    max_enemy_hp real
);


--
-- Name: scene_gameplay_data_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.scene_gameplay_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: scene_gameplay_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.scene_gameplay_data_id_seq OWNED BY public.scene_gameplay_data.id;


--
-- Name: scene_wave_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scene_wave_configs (
    id integer NOT NULL,
    scene_id integer NOT NULL,
    max_enemies_per_wave integer DEFAULT 5 NOT NULL,
    wave_count integer DEFAULT 10 NOT NULL,
    spawn_interval_ms integer DEFAULT 2000 NOT NULL,
    scaling_factor double precision DEFAULT 1.0 NOT NULL,
    hp_multiplier double precision DEFAULT 1.0 NOT NULL,
    gold_multiplier double precision DEFAULT 1.0 NOT NULL,
    entity_pool jsonb DEFAULT '[]'::jsonb NOT NULL,
    boss_entity_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: scene_wave_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.scene_wave_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: scene_wave_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.scene_wave_configs_id_seq OWNED BY public.scene_wave_configs.id;


--
-- Name: scenes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scenes (
    id integer NOT NULL,
    chapter_id integer NOT NULL,
    scene_number integer NOT NULL,
    title character varying(255),
    summary text,
    raw_text text,
    sort_order integer NOT NULL,
    primary_location_id integer,
    has_hard_break boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    scene_type text DEFAULT 'normal'::text NOT NULL,
    boss_config jsonb
);


--
-- Name: scenes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.scenes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: scenes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.scenes_id_seq OWNED BY public.scenes.id;


--
-- Name: semantic_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.semantic_tags (
    id integer NOT NULL,
    story_beat_id integer NOT NULL,
    category character varying(50) NOT NULL,
    value character varying(100) NOT NULL,
    canonical_value character varying(100),
    notes text,
    ai_provider character varying(50),
    ai_model_id character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: semantic_tags_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.semantic_tags_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: semantic_tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.semantic_tags_id_seq OWNED BY public.semantic_tags.id;


--
-- Name: server_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.server_config (
    key character varying(100) NOT NULL,
    value text,
    value_type character varying(20),
    category character varying(50),
    description text,
    default_value text,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by character varying(255),
    game_impact text,
    CONSTRAINT server_config_category_check CHECK (((category)::text = ANY (ARRAY[('game'::character varying)::text, ('ops'::character varying)::text]))),
    CONSTRAINT server_config_value_type_check CHECK (((value_type)::text = ANY (ARRAY[('string'::character varying)::text, ('integer'::character varying)::text, ('numeric'::character varying)::text, ('boolean'::character varying)::text, ('text'::character varying)::text])))
);


--
-- Name: session_upgrades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session_upgrades (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    session_id uuid,
    upgrade_type character varying(50) NOT NULL,
    target_id integer,
    level integer DEFAULT 0,
    total_cost_paid numeric DEFAULT 0,
    current_multiplier numeric DEFAULT 1.0
);


--
-- Name: shard_packages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shard_packages (
    id integer NOT NULL,
    tier_key character varying(30) NOT NULL,
    name character varying(100) NOT NULL,
    description character varying(255) DEFAULT NULL::character varying,
    price_cents integer NOT NULL,
    base_shards integer NOT NULL,
    bonus_pct integer DEFAULT 0 NOT NULL,
    total_shards integer NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_best_value boolean DEFAULT false NOT NULL,
    max_purchases_per_player integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT shard_packages_base_shards_check CHECK ((base_shards > 0)),
    CONSTRAINT shard_packages_bonus_pct_check CHECK (((bonus_pct >= 0) AND (bonus_pct <= 100))),
    CONSTRAINT shard_packages_max_purchases_per_player_check CHECK (((max_purchases_per_player IS NULL) OR (max_purchases_per_player > 0))),
    CONSTRAINT shard_packages_price_cents_check CHECK ((price_cents > 0)),
    CONSTRAINT shard_packages_total_shards_check CHECK ((total_shards > 0))
);


--
-- Name: shard_packages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.shard_packages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: shard_packages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.shard_packages_id_seq OWNED BY public.shard_packages.id;


--
-- Name: shard_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shard_transactions (
    id integer NOT NULL,
    player_id integer NOT NULL,
    amount bigint NOT NULL,
    balance_after bigint NOT NULL,
    source_type character varying(30) NOT NULL,
    source_id integer,
    description character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT shard_transactions_source_type_check CHECK (((source_type)::text = ANY (ARRAY[('purchase'::character varying)::text, ('reward'::character varying)::text, ('spend'::character varying)::text, ('refund'::character varying)::text, ('admin_grant'::character varying)::text, ('admin_deduct'::character varying)::text, ('subscription_stipend'::character varying)::text, ('subscription_refund'::character varying)::text, ('shop_purchase'::character varying)::text, ('admin_refund'::character varying)::text, ('donation'::character varying)::text, ('achievement'::character varying)::text, ('dispute'::character varying)::text, ('dispute_reversal'::character varying)::text, ('marketplace_purchase'::character varying)::text, ('marketplace_sale'::character varying)::text])))
);


--
-- Name: shard_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.shard_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: shard_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.shard_transactions_id_seq OWNED BY public.shard_transactions.id;


--
-- Name: silhouette_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.silhouette_types (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    body_shape text NOT NULL,
    body_ratio_w real DEFAULT 1.0,
    body_ratio_h real DEFAULT 1.0,
    corner_radius real DEFAULT 0.1,
    has_limbs boolean DEFAULT false,
    limb_count integer DEFAULT 0,
    has_head boolean DEFAULT false,
    has_wings boolean DEFAULT false,
    has_weapon_slot boolean DEFAULT false,
    has_eye_glow boolean DEFAULT false,
    sub_unit_count integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: silhouette_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.silhouette_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: silhouette_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.silhouette_types_id_seq OWNED BY public.silhouette_types.id;


--
-- Name: size_classes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.size_classes (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    scale_min real NOT NULL,
    scale_max real NOT NULL,
    width_base real NOT NULL,
    height_base real NOT NULL,
    hitbox_radius real NOT NULL,
    hp_bar_width real NOT NULL,
    hp_bar_offset_y real DEFAULT '-8'::real,
    name_tag_visible boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: size_classes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.size_classes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: size_classes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.size_classes_id_seq OWNED BY public.size_classes.id;


--
-- Name: shop_bundle_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shop_bundle_items (
    id integer NOT NULL,
    bundle_id integer NOT NULL,
    shop_item_id integer NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);


--
-- Name: shop_bundle_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.shop_bundle_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: shop_bundle_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.shop_bundle_items_id_seq OWNED BY public.shop_bundle_items.id;


--
-- Name: shop_bundles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shop_bundles (
    id integer NOT NULL,
    bundle_key character varying(60) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    price_shards integer NOT NULL,
    original_price_shards integer NOT NULL,
    discount_pct integer DEFAULT 20 NOT NULL,
    icon_asset_key character varying(255) DEFAULT NULL::character varying,
    is_active boolean DEFAULT true NOT NULL,
    is_featured boolean DEFAULT false NOT NULL,
    featured_from timestamp with time zone,
    featured_until timestamp with time zone,
    available_from timestamp with time zone,
    available_until timestamp with time zone,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT shop_bundles_discount_pct_check CHECK (((discount_pct >= 0) AND (discount_pct <= 100))),
    CONSTRAINT shop_bundles_original_price_shards_check CHECK ((original_price_shards > 0)),
    CONSTRAINT shop_bundles_price_shards_check CHECK ((price_shards > 0))
);


--
-- Name: shop_bundles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.shop_bundles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: shop_bundles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.shop_bundles_id_seq OWNED BY public.shop_bundles.id;


--
-- Name: shop_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shop_items (
    id integer NOT NULL,
    item_key character varying(60) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    category character varying(20) NOT NULL,
    price_shards integer NOT NULL,
    icon_asset_key character varying(255) DEFAULT NULL::character varying,
    class_restriction integer,
    item_metadata jsonb,
    is_active boolean DEFAULT true NOT NULL,
    is_featured boolean DEFAULT false NOT NULL,
    featured_from timestamp with time zone,
    featured_until timestamp with time zone,
    available_from timestamp with time zone,
    available_until timestamp with time zone,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT shop_items_category_check CHECK (((category)::text = ANY (ARRAY[('skin'::character varying)::text, ('flair'::character varying)::text, ('badge'::character varying)::text, ('avatar'::character varying)::text, ('booster'::character varying)::text, ('patron_badge'::character varying)::text, ('patron_flair'::character varying)::text, ('patron_avatar'::character varying)::text, ('marketplace_permit'::character varying)::text]))),
    CONSTRAINT shop_items_price_shards_check CHECK ((price_shards >= 0))
);


--
-- Name: shop_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.shop_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: shop_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.shop_items_id_seq OWNED BY public.shop_items.id;


--
-- Name: skill_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skill_actions (
    id integer NOT NULL,
    skill_id integer NOT NULL,
    name character varying(100) NOT NULL,
    display_name character varying(150) NOT NULL,
    lore_description text NOT NULL,
    level_required integer DEFAULT 1 NOT NULL,
    interval_ms integer DEFAULT 3000 NOT NULL,
    xp_per_action integer DEFAULT 10 NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: skill_actions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skill_actions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skill_actions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skill_actions_id_seq OWNED BY public.skill_actions.id;


--
-- Name: skill_prerequisites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skill_prerequisites (
    id integer NOT NULL,
    skill_id integer NOT NULL,
    prerequisite_type character varying(30) NOT NULL,
    ref_id integer,
    min_value integer DEFAULT 1 NOT NULL,
    display_hint text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT skill_prerequisites_prerequisite_type_check CHECK (((prerequisite_type)::text = ANY (ARRAY[('idle_skill_level'::character varying)::text, ('active_skill_level'::character varying)::text, ('stat_value'::character varying)::text, ('character_level'::character varying)::text, ('scene_cleared'::character varying)::text])))
);


--
-- Name: skill_prerequisites_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skill_prerequisites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skill_prerequisites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skill_prerequisites_id_seq OWNED BY public.skill_prerequisites.id;


--
-- Name: skills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skills (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    category character varying(50) NOT NULL,
    description text,
    benefits_json jsonb DEFAULT '{}'::jsonb,
    xp_curve_type character varying(50) DEFAULT 'standard'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    cooldown_type character varying(20) DEFAULT 'individual'::character varying,
    base_cooldown_seconds integer DEFAULT 30,
    base_cost_gold numeric DEFAULT 100,
    cost_scaling_factor numeric DEFAULT 1.15,
    unlock_scene_id integer,
    unlock_display_text text,
    idle_flavor_title character varying(100),
    updated_at timestamp with time zone DEFAULT now(),
    display_name character varying(100) DEFAULT NULL::character varying,
    level_0_xp_requirement integer DEFAULT 0 NOT NULL,
    class_id integer,
    is_class_exclusive boolean DEFAULT false NOT NULL,
    idle_level_scaling jsonb,
    effect_type character varying(50) DEFAULT NULL::character varying,
    activate_sfx_key character varying(100)
);


--
-- Name: skills_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skills_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skills_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skills_id_seq OWNED BY public.skills.id;


--
-- Name: stat_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stat_definitions (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    display_name character varying(100) NOT NULL,
    value_type character varying(50) NOT NULL,
    min_value numeric,
    max_value numeric,
    description text,
    category character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: stat_definitions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stat_definitions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stat_definitions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stat_definitions_id_seq OWNED BY public.stat_definitions.id;


--
-- Name: story_beats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.story_beats (
    id integer NOT NULL,
    scene_id integer NOT NULL,
    beat_number integer NOT NULL,
    summary character varying(500),
    raw_text text,
    sort_order integer NOT NULL,
    location_id integer,
    intensity smallint,
    pacing character varying(50),
    timeline_context character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    content_image_path character varying(255) DEFAULT NULL::character varying,
    audio_path character varying(255) DEFAULT NULL::character varying,
    audio_duration_seconds integer DEFAULT 0 NOT NULL,
    hidden_lore_text text,
    lore_intelligence_threshold integer,
    CONSTRAINT story_beats_intensity_check CHECK (((intensity >= 1) AND (intensity <= 5))),
    CONSTRAINT story_beats_timeline_context_check CHECK (((timeline_context)::text = ANY (ARRAY[('present'::character varying)::text, ('flashback'::character varying)::text, ('dream'::character varying)::text, ('vision'::character varying)::text, ('future'::character varying)::text])))
);


--
-- Name: story_beats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.story_beats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: story_beats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.story_beats_id_seq OWNED BY public.story_beats.id;


--
-- Name: stripe_webhook_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stripe_webhook_events (
    id integer NOT NULL,
    stripe_event_id character varying(255) NOT NULL,
    event_type character varying(100) NOT NULL,
    payload jsonb NOT NULL,
    processed boolean DEFAULT false NOT NULL,
    processing_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    processed_at timestamp with time zone
);


--
-- Name: stripe_webhook_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stripe_webhook_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stripe_webhook_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stripe_webhook_events_id_seq OWNED BY public.stripe_webhook_events.id;


--
-- Name: subscription_stipend_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_stipend_log (
    id integer NOT NULL,
    subscription_id integer NOT NULL,
    player_id integer NOT NULL,
    period_key character varying(7) NOT NULL,
    shards_credited integer NOT NULL,
    stripe_invoice_id character varying(255) DEFAULT NULL::character varying,
    period_start timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT subscription_stipend_log_shards_credited_check CHECK ((shards_credited > 0))
);


--
-- Name: subscription_stipend_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subscription_stipend_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subscription_stipend_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subscription_stipend_log_id_seq OWNED BY public.subscription_stipend_log.id;


--
-- Name: support_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_attachments (
    id integer NOT NULL,
    ticket_id integer NOT NULL,
    reply_id integer,
    file_name character varying(255) NOT NULL,
    file_path text NOT NULL,
    file_size integer NOT NULL,
    mime_type character varying(100) NOT NULL,
    uploaded_by integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: support_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.support_attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: support_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.support_attachments_id_seq OWNED BY public.support_attachments.id;


--
-- Name: support_replies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_replies (
    id integer NOT NULL,
    ticket_id integer NOT NULL,
    author_type character varying(10),
    author_id integer,
    author_email character varying(255),
    content text NOT NULL,
    is_internal_note boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT support_replies_author_type_check CHECK (((author_type)::text = ANY (ARRAY[('player'::character varying)::text, ('admin'::character varying)::text])))
);


--
-- Name: support_replies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.support_replies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: support_replies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.support_replies_id_seq OWNED BY public.support_replies.id;


--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_tickets (
    id integer NOT NULL,
    player_id integer NOT NULL,
    category character varying(50),
    priority character varying(20) DEFAULT 'normal'::character varying,
    subject character varying(100) NOT NULL,
    status character varying(20) DEFAULT 'open'::character varying,
    assigned_admin character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    resolved_at timestamp with time zone,
    closed_at timestamp with time zone,
    player_last_viewed_at timestamp with time zone,
    admin_last_viewed_at timestamp with time zone,
    CONSTRAINT support_tickets_category_check CHECK (((category)::text = ANY (ARRAY[('bug_report'::character varying)::text, ('account_issue'::character varying)::text, ('payment_issue'::character varying)::text, ('feedback'::character varying)::text, ('other'::character varying)::text]))),
    CONSTRAINT support_tickets_priority_check CHECK (((priority)::text = ANY (ARRAY[('low'::character varying)::text, ('normal'::character varying)::text, ('high'::character varying)::text, ('critical'::character varying)::text]))),
    CONSTRAINT support_tickets_status_check CHECK (((status)::text = ANY (ARRAY[('open'::character varying)::text, ('in_progress'::character varying)::text, ('resolved'::character varying)::text, ('closed'::character varying)::text])))
);


--
-- Name: support_tickets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.support_tickets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: support_tickets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.support_tickets_id_seq OWNED BY public.support_tickets.id;


--
-- Name: titles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.titles (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    display_format character varying(10) NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    achievement_id integer,
    CONSTRAINT titles_display_format_check CHECK (((display_format)::text = ANY (ARRAY[('prefix'::character varying)::text, ('suffix'::character varying)::text])))
);


--
-- Name: titles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.titles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: titles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.titles_id_seq OWNED BY public.titles.id;


--
-- Name: type_base_attack_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.type_base_attack_types (
    id integer NOT NULL,
    type_base_id integer NOT NULL,
    attack_type_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: type_base_attack_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.type_base_attack_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: type_base_attack_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.type_base_attack_types_id_seq OWNED BY public.type_base_attack_types.id;


--
-- Name: visual_behaviors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visual_behaviors (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    display_name character varying(100) NOT NULL,
    description text,
    animation_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    stat_weights jsonb
);


--
-- Name: visual_behaviors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.visual_behaviors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: visual_behaviors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.visual_behaviors_id_seq OWNED BY public.visual_behaviors.id;


--
-- Name: wave_preset_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wave_preset_assignments (
    id integer NOT NULL,
    wave_preset_id integer NOT NULL,
    book_id integer,
    chapter_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wpa_exactly_one_target CHECK ((((book_id IS NOT NULL) AND (chapter_id IS NULL)) OR ((book_id IS NULL) AND (chapter_id IS NOT NULL))))
);


--
-- Name: wave_preset_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.wave_preset_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: wave_preset_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.wave_preset_assignments_id_seq OWNED BY public.wave_preset_assignments.id;


--
-- Name: wave_presets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wave_presets (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: wave_presets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.wave_presets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: wave_presets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.wave_presets_id_seq OWNED BY public.wave_presets.id;


--
-- Name: achievements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievements ALTER COLUMN id SET DEFAULT nextval('public.achievements_id_seq'::regclass);


--
-- Name: activity_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_events ALTER COLUMN id SET DEFAULT nextval('public.activity_events_id_seq'::regclass);


--
-- Name: admin_audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_log ALTER COLUMN id SET DEFAULT nextval('public.admin_audit_log_id_seq'::regclass);


--
-- Name: admin_essence_adjustments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_essence_adjustments ALTER COLUMN id SET DEFAULT nextval('public.admin_essence_adjustments_id_seq'::regclass);


--
-- Name: admin_shard_adjustments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_shard_adjustments ALTER COLUMN id SET DEFAULT nextval('public.admin_shard_adjustments_id_seq'::regclass);


--
-- Name: artifact_prefixes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artifact_prefixes ALTER COLUMN id SET DEFAULT nextval('public.artifact_prefixes_id_seq'::regclass);


--
-- Name: artifact_suffixes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artifact_suffixes ALTER COLUMN id SET DEFAULT nextval('public.artifact_suffixes_id_seq'::regclass);


--
-- Name: artifact_type_bases id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artifact_type_bases ALTER COLUMN id SET DEFAULT nextval('public.artifact_type_bases_id_seq'::regclass);


--
-- Name: artifacts_legacy id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artifacts_legacy ALTER COLUMN id SET DEFAULT nextval('public.artifacts_id_seq'::regclass);


--
-- Name: animation_styles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.animation_styles ALTER COLUMN id SET DEFAULT nextval('public.animation_styles_id_seq'::regclass);


--
-- Name: armor_classes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.armor_classes ALTER COLUMN id SET DEFAULT nextval('public.armor_classes_id_seq'::regclass);


--
-- Name: asset_registry id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_registry ALTER COLUMN id SET DEFAULT nextval('public.asset_registry_id_seq'::regclass);


--
-- Name: atmospheres id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.atmospheres ALTER COLUMN id SET DEFAULT nextval('public.atmospheres_id_seq'::regclass);


--
-- Name: attack_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attack_types ALTER COLUMN id SET DEFAULT nextval('public.attack_types_id_seq'::regclass);


--
-- Name: audio_configs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audio_configs ALTER COLUMN id SET DEFAULT nextval('public.audio_configs_id_seq'::regclass);


--
-- Name: backgrounds id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backgrounds ALTER COLUMN id SET DEFAULT nextval('public.backgrounds_id_seq'::regclass);


--
-- Name: benefit_effect_data id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.benefit_effect_data ALTER COLUMN id SET DEFAULT nextval('public.benefit_effect_data_id_seq'::regclass);


--
-- Name: books id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.books ALTER COLUMN id SET DEFAULT nextval('public.books_id_seq'::regclass);


--
-- Name: boss_completions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boss_completions ALTER COLUMN id SET DEFAULT nextval('public.boss_completions_id_seq'::regclass);


--
-- Name: chapters id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapters ALTER COLUMN id SET DEFAULT nextval('public.chapters_id_seq'::regclass);


--
-- Name: character_classes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_classes ALTER COLUMN id SET DEFAULT nextval('public.character_classes_id_seq'::regclass);


--
-- Name: character_skill_levels id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_skill_levels ALTER COLUMN id SET DEFAULT nextval('public.character_skill_levels_id_seq'::regclass);


--
-- Name: character_stats id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_stats ALTER COLUMN id SET DEFAULT nextval('public.character_stats_id_seq'::regclass);


--
-- Name: class_stat_affinities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_stat_affinities ALTER COLUMN id SET DEFAULT nextval('public.class_stat_affinities_id_seq'::regclass);


--
-- Name: curated_artifact_tiers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curated_artifact_tiers ALTER COLUMN id SET DEFAULT nextval('public.curated_artifact_tiers_id_seq'::regclass);


--
-- Name: curated_artifacts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curated_artifacts ALTER COLUMN id SET DEFAULT nextval('public.curated_artifacts_id_seq'::regclass);


--
-- Name: dev_content_audit id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dev_content_audit ALTER COLUMN id SET DEFAULT nextval('public.dev_content_audit_id_seq'::regclass);


--
-- Name: difficulty_curves id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.difficulty_curves ALTER COLUMN id SET DEFAULT nextval('public.difficulty_curves_id_seq'::regclass);


--
-- Name: difficulty_presets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.difficulty_presets ALTER COLUMN id SET DEFAULT nextval('public.difficulty_presets_id_seq'::regclass);


--
-- Name: donations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donations ALTER COLUMN id SET DEFAULT nextval('public.donations_id_seq'::regclass);


--
-- Name: entities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entities ALTER COLUMN id SET DEFAULT nextval('public.entities_id_seq'::regclass);


--
-- Name: entity_aliases id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_aliases ALTER COLUMN id SET DEFAULT nextval('public.entity_aliases_id_seq'::regclass);


--
-- Name: entity_attack_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_attack_types ALTER COLUMN id SET DEFAULT nextval('public.entity_attack_types_id_seq'::regclass);


--
-- Name: entity_beat_appearances id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_beat_appearances ALTER COLUMN id SET DEFAULT nextval('public.entity_beat_appearances_id_seq'::regclass);


--
-- Name: entity_families id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_families ALTER COLUMN id SET DEFAULT nextval('public.entity_families_id_seq'::regclass);


--
-- Name: entity_gameplay_data id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_gameplay_data ALTER COLUMN id SET DEFAULT nextval('public.entity_gameplay_data_id_seq'::regclass);


--
-- Name: entity_scene_appearances id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_scene_appearances ALTER COLUMN id SET DEFAULT nextval('public.entity_scene_appearances_id_seq'::regclass);


--
-- Name: entity_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_types ALTER COLUMN id SET DEFAULT nextval('public.entity_types_id_seq'::regclass);


--
-- Name: gear_slots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gear_slots ALTER COLUMN id SET DEFAULT nextval('public.gear_slots_id_seq'::regclass);


--
-- Name: idle_skill_stat_contributions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.idle_skill_stat_contributions ALTER COLUMN id SET DEFAULT nextval('public.idle_skill_stat_contributions_id_seq'::regclass);


--
-- Name: inventory_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items ALTER COLUMN id SET DEFAULT nextval('public.inventory_items_id_seq'::regclass);


--
-- Name: item_lore_tags id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_lore_tags ALTER COLUMN id SET DEFAULT nextval('public.item_lore_tags_id_seq'::regclass);


--
-- Name: item_prefixes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_prefixes ALTER COLUMN id SET DEFAULT nextval('public.item_prefixes_id_seq'::regclass);


--
-- Name: item_qualities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_qualities ALTER COLUMN id SET DEFAULT nextval('public.item_qualities_id_seq'::regclass);


--
-- Name: item_suffixes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_suffixes ALTER COLUMN id SET DEFAULT nextval('public.item_suffixes_id_seq'::regclass);


--
-- Name: item_type_bases id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_type_bases ALTER COLUMN id SET DEFAULT nextval('public.item_type_bases_id_seq'::regclass);


--
-- Name: leaderboard_cache id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leaderboard_cache ALTER COLUMN id SET DEFAULT nextval('public.leaderboard_cache_id_seq'::regclass);


--
-- Name: location_aliases id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location_aliases ALTER COLUMN id SET DEFAULT nextval('public.location_aliases_id_seq'::regclass);


--
-- Name: location_scene_appearances id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location_scene_appearances ALTER COLUMN id SET DEFAULT nextval('public.location_scene_appearances_id_seq'::regclass);


--
-- Name: locations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations ALTER COLUMN id SET DEFAULT nextval('public.locations_id_seq'::regclass);


--
-- Name: marketplace_listings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_listings ALTER COLUMN id SET DEFAULT nextval('public.marketplace_listings_id_seq'::regclass);


--
-- Name: marketplace_notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_notifications ALTER COLUMN id SET DEFAULT nextval('public.marketplace_notifications_id_seq'::regclass);


--
-- Name: marketplace_price_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_price_history ALTER COLUMN id SET DEFAULT nextval('public.marketplace_price_history_id_seq'::regclass);


--
-- Name: marketplace_trades id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_trades ALTER COLUMN id SET DEFAULT nextval('public.marketplace_trades_id_seq'::regclass);


--
-- Name: movement_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movement_types ALTER COLUMN id SET DEFAULT nextval('public.movement_types_id_seq'::regclass);


--
-- Name: payment_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_orders ALTER COLUMN id SET DEFAULT nextval('public.payment_orders_id_seq'::regclass);


--
-- Name: player_achievements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_achievements ALTER COLUMN id SET DEFAULT nextval('public.player_achievements_id_seq'::regclass);


--
-- Name: player_active_boosters id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_active_boosters ALTER COLUMN id SET DEFAULT nextval('public.player_active_boosters_id_seq'::regclass);


--
-- Name: player_artifacts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_artifacts ALTER COLUMN id SET DEFAULT nextval('public.player_artifacts_id_seq'::regclass);


--
-- Name: player_characters id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_characters ALTER COLUMN id SET DEFAULT nextval('public.player_characters_id_seq'::regclass);


--
-- Name: player_collections_legacy id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_collections_legacy ALTER COLUMN id SET DEFAULT nextval('public.player_collections_id_seq'::regclass);


--
-- Name: player_discovery_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_discovery_log ALTER COLUMN id SET DEFAULT nextval('public.player_discovery_log_id_seq'::regclass);


--
-- Name: player_entity_discovery id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_entity_discovery ALTER COLUMN id SET DEFAULT nextval('public.player_entity_discovery_id_seq'::regclass);


--
-- Name: player_essence id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_essence ALTER COLUMN id SET DEFAULT nextval('public.player_essence_id_seq'::regclass);


--
-- Name: player_inventory id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_inventory ALTER COLUMN id SET DEFAULT nextval('public.player_inventory_id_seq'::regclass);


--
-- Name: player_progress id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_progress ALTER COLUMN id SET DEFAULT nextval('public.player_progress_id_seq'::regclass);


--
-- Name: player_scene_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_scene_records ALTER COLUMN id SET DEFAULT nextval('public.player_scene_records_id_seq'::regclass);


--
-- Name: player_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_settings ALTER COLUMN id SET DEFAULT nextval('public.player_settings_id_seq'::regclass);


--
-- Name: player_shop_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_shop_items ALTER COLUMN id SET DEFAULT nextval('public.player_shop_items_id_seq'::regclass);


--
-- Name: player_subscriptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_subscriptions ALTER COLUMN id SET DEFAULT nextval('public.player_subscriptions_id_seq'::regclass);


--
-- Name: player_titles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_titles ALTER COLUMN id SET DEFAULT nextval('public.player_titles_id_seq'::regclass);


--
-- Name: players id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players ALTER COLUMN id SET DEFAULT nextval('public.players_id_seq'::regclass);


--
-- Name: processing_runs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processing_runs ALTER COLUMN id SET DEFAULT nextval('public.processing_runs_id_seq'::regclass);


--
-- Name: review_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_items ALTER COLUMN id SET DEFAULT nextval('public.review_items_id_seq'::regclass);


--
-- Name: scene_audio_sync id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scene_audio_sync ALTER COLUMN id SET DEFAULT nextval('public.scene_audio_sync_id_seq'::regclass);


--
-- Name: scene_gameplay_data id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scene_gameplay_data ALTER COLUMN id SET DEFAULT nextval('public.scene_gameplay_data_id_seq'::regclass);


--
-- Name: scene_wave_configs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scene_wave_configs ALTER COLUMN id SET DEFAULT nextval('public.scene_wave_configs_id_seq'::regclass);


--
-- Name: scenes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenes ALTER COLUMN id SET DEFAULT nextval('public.scenes_id_seq'::regclass);


--
-- Name: semantic_tags id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.semantic_tags ALTER COLUMN id SET DEFAULT nextval('public.semantic_tags_id_seq'::regclass);


--
-- Name: shard_packages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shard_packages ALTER COLUMN id SET DEFAULT nextval('public.shard_packages_id_seq'::regclass);


--
-- Name: shard_transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shard_transactions ALTER COLUMN id SET DEFAULT nextval('public.shard_transactions_id_seq'::regclass);


--
-- Name: silhouette_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.silhouette_types ALTER COLUMN id SET DEFAULT nextval('public.silhouette_types_id_seq'::regclass);


--
-- Name: size_classes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.size_classes ALTER COLUMN id SET DEFAULT nextval('public.size_classes_id_seq'::regclass);


--
-- Name: shop_bundle_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_bundle_items ALTER COLUMN id SET DEFAULT nextval('public.shop_bundle_items_id_seq'::regclass);


--
-- Name: shop_bundles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_bundles ALTER COLUMN id SET DEFAULT nextval('public.shop_bundles_id_seq'::regclass);


--
-- Name: shop_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_items ALTER COLUMN id SET DEFAULT nextval('public.shop_items_id_seq'::regclass);


--
-- Name: skill_actions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skill_actions ALTER COLUMN id SET DEFAULT nextval('public.skill_actions_id_seq'::regclass);


--
-- Name: skill_prerequisites id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skill_prerequisites ALTER COLUMN id SET DEFAULT nextval('public.skill_prerequisites_id_seq'::regclass);


--
-- Name: skills id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills ALTER COLUMN id SET DEFAULT nextval('public.skills_id_seq'::regclass);


--
-- Name: stat_definitions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stat_definitions ALTER COLUMN id SET DEFAULT nextval('public.stat_definitions_id_seq'::regclass);


--
-- Name: story_beats id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_beats ALTER COLUMN id SET DEFAULT nextval('public.story_beats_id_seq'::regclass);


--
-- Name: stripe_webhook_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_webhook_events ALTER COLUMN id SET DEFAULT nextval('public.stripe_webhook_events_id_seq'::regclass);


--
-- Name: subscription_stipend_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_stipend_log ALTER COLUMN id SET DEFAULT nextval('public.subscription_stipend_log_id_seq'::regclass);


--
-- Name: support_attachments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_attachments ALTER COLUMN id SET DEFAULT nextval('public.support_attachments_id_seq'::regclass);


--
-- Name: support_replies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_replies ALTER COLUMN id SET DEFAULT nextval('public.support_replies_id_seq'::regclass);


--
-- Name: support_tickets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets ALTER COLUMN id SET DEFAULT nextval('public.support_tickets_id_seq'::regclass);


--
-- Name: titles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.titles ALTER COLUMN id SET DEFAULT nextval('public.titles_id_seq'::regclass);


--
-- Name: type_base_attack_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.type_base_attack_types ALTER COLUMN id SET DEFAULT nextval('public.type_base_attack_types_id_seq'::regclass);


--
-- Name: visual_behaviors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visual_behaviors ALTER COLUMN id SET DEFAULT nextval('public.visual_behaviors_id_seq'::regclass);


--
-- Name: wave_preset_assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wave_preset_assignments ALTER COLUMN id SET DEFAULT nextval('public.wave_preset_assignments_id_seq'::regclass);


--
-- Name: wave_presets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wave_presets ALTER COLUMN id SET DEFAULT nextval('public.wave_presets_id_seq'::regclass);


--
-- Name: achievements achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_pkey PRIMARY KEY (id);


--
-- Name: activity_events activity_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_events
    ADD CONSTRAINT activity_events_pkey PRIMARY KEY (id);


--
-- Name: admin_audit_log admin_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_log
    ADD CONSTRAINT admin_audit_log_pkey PRIMARY KEY (id);


--
-- Name: admin_essence_adjustments admin_essence_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_essence_adjustments
    ADD CONSTRAINT admin_essence_adjustments_pkey PRIMARY KEY (id);


--
-- Name: admin_shard_adjustments admin_shard_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_shard_adjustments
    ADD CONSTRAINT admin_shard_adjustments_pkey PRIMARY KEY (id);


--
-- Name: admin_whitelist_emails admin_whitelist_emails_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_whitelist_emails
    ADD CONSTRAINT admin_whitelist_emails_pkey PRIMARY KEY (email);


--
-- Name: admin_whitelist_ips admin_whitelist_ips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_whitelist_ips
    ADD CONSTRAINT admin_whitelist_ips_pkey PRIMARY KEY (ip_address);


--
-- Name: artifact_prefixes artifact_prefixes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artifact_prefixes
    ADD CONSTRAINT artifact_prefixes_code_key UNIQUE (code);


--
-- Name: artifact_prefixes artifact_prefixes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artifact_prefixes
    ADD CONSTRAINT artifact_prefixes_pkey PRIMARY KEY (id);


--
-- Name: artifact_suffixes artifact_suffixes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artifact_suffixes
    ADD CONSTRAINT artifact_suffixes_code_key UNIQUE (code);


--
-- Name: artifact_suffixes artifact_suffixes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artifact_suffixes
    ADD CONSTRAINT artifact_suffixes_pkey PRIMARY KEY (id);


--
-- Name: artifact_type_bases artifact_type_bases_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artifact_type_bases
    ADD CONSTRAINT artifact_type_bases_code_key UNIQUE (code);


--
-- Name: artifact_type_bases artifact_type_bases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artifact_type_bases
    ADD CONSTRAINT artifact_type_bases_pkey PRIMARY KEY (id);


--
-- Name: artifacts_legacy artifacts_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artifacts_legacy
    ADD CONSTRAINT artifacts_name_key UNIQUE (name);


--
-- Name: artifacts_legacy artifacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artifacts_legacy
    ADD CONSTRAINT artifacts_pkey PRIMARY KEY (id);


--
-- Name: asset_registry asset_registry_asset_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_registry
    ADD CONSTRAINT asset_registry_asset_key_key UNIQUE (asset_key);


--
-- Name: animation_styles animation_styles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.animation_styles
    ADD CONSTRAINT animation_styles_pkey PRIMARY KEY (id);


--
-- Name: animation_styles animation_styles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.animation_styles
    ADD CONSTRAINT animation_styles_name_key UNIQUE (name);


--
-- Name: armor_classes armor_classes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.armor_classes
    ADD CONSTRAINT armor_classes_pkey PRIMARY KEY (id);


--
-- Name: armor_classes armor_classes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.armor_classes
    ADD CONSTRAINT armor_classes_code_key UNIQUE (code);


--
-- Name: asset_registry asset_registry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_registry
    ADD CONSTRAINT asset_registry_pkey PRIMARY KEY (id);


--
-- Name: atmospheres atmospheres_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.atmospheres
    ADD CONSTRAINT atmospheres_name_key UNIQUE (name);


--
-- Name: atmospheres atmospheres_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.atmospheres
    ADD CONSTRAINT atmospheres_pkey PRIMARY KEY (id);


--
-- Name: attack_types attack_types_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attack_types
    ADD CONSTRAINT attack_types_name_key UNIQUE (name);


--
-- Name: attack_types attack_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attack_types
    ADD CONSTRAINT attack_types_pkey PRIMARY KEY (id);


--
-- Name: audio_configs audio_configs_config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audio_configs
    ADD CONSTRAINT audio_configs_config_key_key UNIQUE (config_key);


--
-- Name: audio_configs audio_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audio_configs
    ADD CONSTRAINT audio_configs_pkey PRIMARY KEY (id);


--
-- Name: backgrounds backgrounds_background_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backgrounds
    ADD CONSTRAINT backgrounds_background_key_key UNIQUE (background_key);


--
-- Name: backgrounds backgrounds_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backgrounds
    ADD CONSTRAINT backgrounds_name_key UNIQUE (name);


--
-- Name: backgrounds backgrounds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backgrounds
    ADD CONSTRAINT backgrounds_pkey PRIMARY KEY (id);


--
-- Name: benefit_effect_data benefit_effect_data_effect_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.benefit_effect_data
    ADD CONSTRAINT benefit_effect_data_effect_key_key UNIQUE (effect_key);


--
-- Name: benefit_effect_data benefit_effect_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.benefit_effect_data
    ADD CONSTRAINT benefit_effect_data_pkey PRIMARY KEY (id);


--
-- Name: books books_book_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_book_number_key UNIQUE (book_number);


--
-- Name: books books_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_pkey PRIMARY KEY (id);


--
-- Name: boss_completions boss_completions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boss_completions
    ADD CONSTRAINT boss_completions_pkey PRIMARY KEY (id);


--
-- Name: chapters chapters_book_id_chapter_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapters
    ADD CONSTRAINT chapters_book_id_chapter_number_key UNIQUE (book_id, chapter_number);


--
-- Name: chapters chapters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapters
    ADD CONSTRAINT chapters_pkey PRIMARY KEY (id);


--
-- Name: character_classes character_classes_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_classes
    ADD CONSTRAINT character_classes_name_key UNIQUE (name);


--
-- Name: character_classes character_classes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_classes
    ADD CONSTRAINT character_classes_pkey PRIMARY KEY (id);


--
-- Name: character_skill_levels character_skill_levels_character_id_skill_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_skill_levels
    ADD CONSTRAINT character_skill_levels_character_id_skill_id_key UNIQUE (character_id, skill_id);


--
-- Name: character_skill_levels character_skill_levels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_skill_levels
    ADD CONSTRAINT character_skill_levels_pkey PRIMARY KEY (id);


--
-- Name: character_stats character_stats_character_id_stat_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_stats
    ADD CONSTRAINT character_stats_character_id_stat_id_key UNIQUE (character_id, stat_id);


--
-- Name: character_stats character_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_stats
    ADD CONSTRAINT character_stats_pkey PRIMARY KEY (id);


--
-- Name: chat_channels chat_channels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_channels
    ADD CONSTRAINT chat_channels_pkey PRIMARY KEY (id);


--
-- Name: class_stat_affinities class_stat_affinities_class_id_stat_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_stat_affinities
    ADD CONSTRAINT class_stat_affinities_class_id_stat_id_key UNIQUE (class_id, stat_id);


--
-- Name: class_stat_affinities class_stat_affinities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_stat_affinities
    ADD CONSTRAINT class_stat_affinities_pkey PRIMARY KEY (id);


--
-- Name: curated_artifact_tiers curated_artifact_tiers_curated_artifact_id_rarity_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curated_artifact_tiers
    ADD CONSTRAINT curated_artifact_tiers_curated_artifact_id_rarity_key UNIQUE (curated_artifact_id, rarity);


--
-- Name: curated_artifact_tiers curated_artifact_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curated_artifact_tiers
    ADD CONSTRAINT curated_artifact_tiers_pkey PRIMARY KEY (id);


--
-- Name: curated_artifacts curated_artifacts_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curated_artifacts
    ADD CONSTRAINT curated_artifacts_name_key UNIQUE (name);


--
-- Name: curated_artifacts curated_artifacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curated_artifacts
    ADD CONSTRAINT curated_artifacts_pkey PRIMARY KEY (id);


--
-- Name: dev_content_audit dev_content_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dev_content_audit
    ADD CONSTRAINT dev_content_audit_pkey PRIMARY KEY (id);


--
-- Name: difficulty_curves difficulty_curves_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.difficulty_curves
    ADD CONSTRAINT difficulty_curves_name_key UNIQUE (name);


--
-- Name: difficulty_curves difficulty_curves_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.difficulty_curves
    ADD CONSTRAINT difficulty_curves_pkey PRIMARY KEY (id);


--
-- Name: difficulty_presets difficulty_presets_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.difficulty_presets
    ADD CONSTRAINT difficulty_presets_name_key UNIQUE (name);


--
-- Name: difficulty_presets difficulty_presets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.difficulty_presets
    ADD CONSTRAINT difficulty_presets_pkey PRIMARY KEY (id);


--
-- Name: donations donations_payment_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donations
    ADD CONSTRAINT donations_payment_order_id_key UNIQUE (payment_order_id);


--
-- Name: donations donations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donations
    ADD CONSTRAINT donations_pkey PRIMARY KEY (id);


--
-- Name: entities entities_canonical_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entities
    ADD CONSTRAINT entities_canonical_name_key UNIQUE (canonical_name);


--
-- Name: entities entities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entities
    ADD CONSTRAINT entities_pkey PRIMARY KEY (id);


--
-- Name: entity_aliases entity_aliases_entity_id_alias_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_aliases
    ADD CONSTRAINT entity_aliases_entity_id_alias_key UNIQUE (entity_id, alias);


--
-- Name: entity_aliases entity_aliases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_aliases
    ADD CONSTRAINT entity_aliases_pkey PRIMARY KEY (id);


--
-- Name: entity_attack_types entity_attack_types_entity_id_attack_type_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_attack_types
    ADD CONSTRAINT entity_attack_types_entity_id_attack_type_id_key UNIQUE (entity_id, attack_type_id);


--
-- Name: entity_attack_types entity_attack_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_attack_types
    ADD CONSTRAINT entity_attack_types_pkey PRIMARY KEY (id);


--
-- Name: entity_beat_appearances entity_beat_appearances_entity_id_story_beat_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_beat_appearances
    ADD CONSTRAINT entity_beat_appearances_entity_id_story_beat_id_key UNIQUE (entity_id, story_beat_id);


--
-- Name: entity_beat_appearances entity_beat_appearances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_beat_appearances
    ADD CONSTRAINT entity_beat_appearances_pkey PRIMARY KEY (id);


--
-- Name: entity_families entity_families_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_families
    ADD CONSTRAINT entity_families_name_key UNIQUE (name);


--
-- Name: entity_families entity_families_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_families
    ADD CONSTRAINT entity_families_pkey PRIMARY KEY (id);


--
-- Name: entity_gameplay_data entity_gameplay_data_entity_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_gameplay_data
    ADD CONSTRAINT entity_gameplay_data_entity_id_key UNIQUE (entity_id);


--
-- Name: entity_gameplay_data entity_gameplay_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_gameplay_data
    ADD CONSTRAINT entity_gameplay_data_pkey PRIMARY KEY (id);


--
-- Name: entity_scene_appearances entity_scene_appearances_entity_id_scene_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_scene_appearances
    ADD CONSTRAINT entity_scene_appearances_entity_id_scene_id_key UNIQUE (entity_id, scene_id);


--
-- Name: entity_scene_appearances entity_scene_appearances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_scene_appearances
    ADD CONSTRAINT entity_scene_appearances_pkey PRIMARY KEY (id);


--
-- Name: entity_types entity_types_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_name_key UNIQUE (name);


--
-- Name: entity_types entity_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_types
    ADD CONSTRAINT entity_types_pkey PRIMARY KEY (id);


--
-- Name: game_configs game_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_configs
    ADD CONSTRAINT game_configs_pkey PRIMARY KEY (key);


--
-- Name: gear_slots gear_slots_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gear_slots
    ADD CONSTRAINT gear_slots_name_key UNIQUE (name);


--
-- Name: gear_slots gear_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gear_slots
    ADD CONSTRAINT gear_slots_pkey PRIMARY KEY (id);


--
-- Name: idle_skill_stat_contributions idle_skill_stat_contributions_idle_skill_id_stat_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.idle_skill_stat_contributions
    ADD CONSTRAINT idle_skill_stat_contributions_idle_skill_id_stat_id_key UNIQUE (idle_skill_id, stat_id);


--
-- Name: idle_skill_stat_contributions idle_skill_stat_contributions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.idle_skill_stat_contributions
    ADD CONSTRAINT idle_skill_stat_contributions_pkey PRIMARY KEY (id);


--
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);


--
-- Name: item_lore_tags item_lore_tags_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_lore_tags
    ADD CONSTRAINT item_lore_tags_code_key UNIQUE (code);


--
-- Name: item_lore_tags item_lore_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_lore_tags
    ADD CONSTRAINT item_lore_tags_pkey PRIMARY KEY (id);


--
-- Name: item_prefixes item_prefixes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_prefixes
    ADD CONSTRAINT item_prefixes_code_key UNIQUE (code);


--
-- Name: item_prefixes item_prefixes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_prefixes
    ADD CONSTRAINT item_prefixes_pkey PRIMARY KEY (id);


--
-- Name: item_qualities item_qualities_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_qualities
    ADD CONSTRAINT item_qualities_code_key UNIQUE (code);


--
-- Name: item_qualities item_qualities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_qualities
    ADD CONSTRAINT item_qualities_pkey PRIMARY KEY (id);


--
-- Name: item_suffixes item_suffixes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_suffixes
    ADD CONSTRAINT item_suffixes_code_key UNIQUE (code);


--
-- Name: item_suffixes item_suffixes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_suffixes
    ADD CONSTRAINT item_suffixes_pkey PRIMARY KEY (id);


--
-- Name: item_type_bases item_type_bases_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_type_bases
    ADD CONSTRAINT item_type_bases_code_key UNIQUE (code);


--
-- Name: item_type_bases item_type_bases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_type_bases
    ADD CONSTRAINT item_type_bases_pkey PRIMARY KEY (id);


--
-- Name: leaderboard_cache leaderboard_cache_category_rank_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leaderboard_cache
    ADD CONSTRAINT leaderboard_cache_category_rank_key UNIQUE (category, rank);


--
-- Name: leaderboard_cache leaderboard_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leaderboard_cache
    ADD CONSTRAINT leaderboard_cache_pkey PRIMARY KEY (id);


--
-- Name: location_aliases location_aliases_location_id_alias_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location_aliases
    ADD CONSTRAINT location_aliases_location_id_alias_key UNIQUE (location_id, alias);


--
-- Name: location_aliases location_aliases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location_aliases
    ADD CONSTRAINT location_aliases_pkey PRIMARY KEY (id);


--
-- Name: location_scene_appearances location_scene_appearances_location_id_scene_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location_scene_appearances
    ADD CONSTRAINT location_scene_appearances_location_id_scene_id_key UNIQUE (location_id, scene_id);


--
-- Name: location_scene_appearances location_scene_appearances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location_scene_appearances
    ADD CONSTRAINT location_scene_appearances_pkey PRIMARY KEY (id);


--
-- Name: locations locations_canonical_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_canonical_name_key UNIQUE (canonical_name);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: marketplace_listings marketplace_listings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_listings
    ADD CONSTRAINT marketplace_listings_pkey PRIMARY KEY (id);


--
-- Name: marketplace_notifications marketplace_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_notifications
    ADD CONSTRAINT marketplace_notifications_pkey PRIMARY KEY (id);


--
-- Name: marketplace_price_history marketplace_price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_price_history
    ADD CONSTRAINT marketplace_price_history_pkey PRIMARY KEY (id);


--
-- Name: marketplace_trades marketplace_trades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_trades
    ADD CONSTRAINT marketplace_trades_pkey PRIMARY KEY (id);


--
-- Name: movement_types movement_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movement_types
    ADD CONSTRAINT movement_types_pkey PRIMARY KEY (id);


--
-- Name: movement_types movement_types_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movement_types
    ADD CONSTRAINT movement_types_name_key UNIQUE (name);


--
-- Name: payment_orders payment_orders_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_orders
    ADD CONSTRAINT payment_orders_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: payment_orders payment_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_orders
    ADD CONSTRAINT payment_orders_pkey PRIMARY KEY (id);


--
-- Name: payment_orders payment_orders_stripe_checkout_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_orders
    ADD CONSTRAINT payment_orders_stripe_checkout_session_id_key UNIQUE (stripe_checkout_session_id);


--
-- Name: player_achievements player_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_achievements
    ADD CONSTRAINT player_achievements_pkey PRIMARY KEY (id);


--
-- Name: player_achievements player_achievements_player_id_achievement_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_achievements
    ADD CONSTRAINT player_achievements_player_id_achievement_id_key UNIQUE (player_id, achievement_id);


--
-- Name: player_active_boosters player_active_boosters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_active_boosters
    ADD CONSTRAINT player_active_boosters_pkey PRIMARY KEY (id);


--
-- Name: player_artifacts player_artifacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_artifacts
    ADD CONSTRAINT player_artifacts_pkey PRIMARY KEY (id);


--
-- Name: player_characters player_characters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_characters
    ADD CONSTRAINT player_characters_pkey PRIMARY KEY (id);


--
-- Name: player_collections_legacy player_collections_character_id_artifact_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_collections_legacy
    ADD CONSTRAINT player_collections_character_id_artifact_id_key UNIQUE (character_id, artifact_id);


--
-- Name: player_collections_legacy player_collections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_collections_legacy
    ADD CONSTRAINT player_collections_pkey PRIMARY KEY (id);


--
-- Name: player_discovery_log player_discovery_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_discovery_log
    ADD CONSTRAINT player_discovery_log_pkey PRIMARY KEY (id);


--
-- Name: player_discovery_log player_discovery_log_player_id_discovery_type_reference_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_discovery_log
    ADD CONSTRAINT player_discovery_log_player_id_discovery_type_reference_id_key UNIQUE (player_id, discovery_type, reference_id);


--
-- Name: player_entity_discovery player_entity_discovery_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_entity_discovery
    ADD CONSTRAINT player_entity_discovery_pkey PRIMARY KEY (id);


--
-- Name: player_entity_discovery player_entity_discovery_player_id_entity_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_entity_discovery
    ADD CONSTRAINT player_entity_discovery_player_id_entity_id_key UNIQUE (player_id, entity_id);


--
-- Name: player_essence player_essence_character_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_essence
    ADD CONSTRAINT player_essence_character_id_key UNIQUE (character_id);


--
-- Name: player_essence player_essence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_essence
    ADD CONSTRAINT player_essence_pkey PRIMARY KEY (id);


--
-- Name: player_inventory player_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_inventory
    ADD CONSTRAINT player_inventory_pkey PRIMARY KEY (id);


--
-- Name: player_meta_progression player_meta_progression_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_meta_progression
    ADD CONSTRAINT player_meta_progression_pkey PRIMARY KEY (player_id);


--
-- Name: player_progress player_progress_character_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_progress
    ADD CONSTRAINT player_progress_character_id_key UNIQUE (character_id);


--
-- Name: player_progress player_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_progress
    ADD CONSTRAINT player_progress_pkey PRIMARY KEY (id);


--
-- Name: player_scene_records player_scene_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_scene_records
    ADD CONSTRAINT player_scene_records_pkey PRIMARY KEY (id);


--
-- Name: player_scene_records player_scene_records_player_id_scene_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_scene_records
    ADD CONSTRAINT player_scene_records_player_id_scene_id_key UNIQUE (player_id, scene_id);


--
-- Name: player_settings player_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_settings
    ADD CONSTRAINT player_settings_pkey PRIMARY KEY (id);


--
-- Name: player_settings player_settings_player_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_settings
    ADD CONSTRAINT player_settings_player_id_key UNIQUE (player_id);


--
-- Name: player_shop_items player_shop_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_shop_items
    ADD CONSTRAINT player_shop_items_pkey PRIMARY KEY (id);


--
-- Name: player_story_sessions player_story_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_story_sessions
    ADD CONSTRAINT player_story_sessions_pkey PRIMARY KEY (id);


--
-- Name: player_subscriptions player_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_subscriptions
    ADD CONSTRAINT player_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: player_titles player_titles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_titles
    ADD CONSTRAINT player_titles_pkey PRIMARY KEY (id);


--
-- Name: player_titles player_titles_player_id_title_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_titles
    ADD CONSTRAINT player_titles_player_id_title_id_key UNIQUE (player_id, title_id);


--
-- Name: players players_firebase_uid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_firebase_uid_key UNIQUE (firebase_uid);


--
-- Name: players players_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_pkey PRIMARY KEY (id);


--
-- Name: processing_runs processing_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processing_runs
    ADD CONSTRAINT processing_runs_pkey PRIMARY KEY (id);


--
-- Name: review_items review_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_items
    ADD CONSTRAINT review_items_pkey PRIMARY KEY (id);


--
-- Name: scene_audio_sync scene_audio_sync_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scene_audio_sync
    ADD CONSTRAINT scene_audio_sync_pkey PRIMARY KEY (id);


--
-- Name: scene_audio_sync scene_audio_sync_scene_id_timestamp_seconds_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scene_audio_sync
    ADD CONSTRAINT scene_audio_sync_scene_id_timestamp_seconds_key UNIQUE (scene_id, timestamp_seconds);


--
-- Name: scene_gameplay_data scene_gameplay_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scene_gameplay_data
    ADD CONSTRAINT scene_gameplay_data_pkey PRIMARY KEY (id);


--
-- Name: scene_gameplay_data scene_gameplay_data_scene_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scene_gameplay_data
    ADD CONSTRAINT scene_gameplay_data_scene_id_key UNIQUE (scene_id);


--
-- Name: scene_wave_configs scene_wave_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scene_wave_configs
    ADD CONSTRAINT scene_wave_configs_pkey PRIMARY KEY (id);


--
-- Name: scene_wave_configs scene_wave_configs_scene_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scene_wave_configs
    ADD CONSTRAINT scene_wave_configs_scene_id_key UNIQUE (scene_id);


--
-- Name: scenes scenes_chapter_id_scene_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenes
    ADD CONSTRAINT scenes_chapter_id_scene_number_key UNIQUE (chapter_id, scene_number);


--
-- Name: scenes scenes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenes
    ADD CONSTRAINT scenes_pkey PRIMARY KEY (id);


--
-- Name: semantic_tags semantic_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.semantic_tags
    ADD CONSTRAINT semantic_tags_pkey PRIMARY KEY (id);


--
-- Name: server_config server_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.server_config
    ADD CONSTRAINT server_config_pkey PRIMARY KEY (key);


--
-- Name: session_upgrades session_upgrades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_upgrades
    ADD CONSTRAINT session_upgrades_pkey PRIMARY KEY (id);


--
-- Name: shard_packages shard_packages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shard_packages
    ADD CONSTRAINT shard_packages_pkey PRIMARY KEY (id);


--
-- Name: shard_packages shard_packages_tier_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shard_packages
    ADD CONSTRAINT shard_packages_tier_key_key UNIQUE (tier_key);


--
-- Name: shard_transactions shard_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shard_transactions
    ADD CONSTRAINT shard_transactions_pkey PRIMARY KEY (id);


--
-- Name: silhouette_types silhouette_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.silhouette_types
    ADD CONSTRAINT silhouette_types_pkey PRIMARY KEY (id);


--
-- Name: silhouette_types silhouette_types_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.silhouette_types
    ADD CONSTRAINT silhouette_types_name_key UNIQUE (name);


--
-- Name: size_classes size_classes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.size_classes
    ADD CONSTRAINT size_classes_pkey PRIMARY KEY (id);


--
-- Name: size_classes size_classes_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.size_classes
    ADD CONSTRAINT size_classes_name_key UNIQUE (name);


--
-- Name: shop_bundle_items shop_bundle_items_bundle_id_shop_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_bundle_items
    ADD CONSTRAINT shop_bundle_items_bundle_id_shop_item_id_key UNIQUE (bundle_id, shop_item_id);


--
-- Name: shop_bundle_items shop_bundle_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_bundle_items
    ADD CONSTRAINT shop_bundle_items_pkey PRIMARY KEY (id);


--
-- Name: shop_bundles shop_bundles_bundle_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_bundles
    ADD CONSTRAINT shop_bundles_bundle_key_key UNIQUE (bundle_key);


--
-- Name: shop_bundles shop_bundles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_bundles
    ADD CONSTRAINT shop_bundles_pkey PRIMARY KEY (id);


--
-- Name: shop_items shop_items_item_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_items
    ADD CONSTRAINT shop_items_item_key_key UNIQUE (item_key);


--
-- Name: shop_items shop_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_items
    ADD CONSTRAINT shop_items_pkey PRIMARY KEY (id);


--
-- Name: skill_actions skill_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skill_actions
    ADD CONSTRAINT skill_actions_pkey PRIMARY KEY (id);


--
-- Name: skill_actions skill_actions_skill_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skill_actions
    ADD CONSTRAINT skill_actions_skill_id_name_key UNIQUE (skill_id, name);


--
-- Name: skill_prerequisites skill_prerequisites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skill_prerequisites
    ADD CONSTRAINT skill_prerequisites_pkey PRIMARY KEY (id);


--
-- Name: skills skills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_pkey PRIMARY KEY (id);


--
-- Name: stat_definitions stat_definitions_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stat_definitions
    ADD CONSTRAINT stat_definitions_name_key UNIQUE (name);


--
-- Name: stat_definitions stat_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stat_definitions
    ADD CONSTRAINT stat_definitions_pkey PRIMARY KEY (id);


--
-- Name: story_beats story_beats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_beats
    ADD CONSTRAINT story_beats_pkey PRIMARY KEY (id);


--
-- Name: story_beats story_beats_scene_id_beat_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_beats
    ADD CONSTRAINT story_beats_scene_id_beat_number_key UNIQUE (scene_id, beat_number);


--
-- Name: stripe_webhook_events stripe_webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_webhook_events
    ADD CONSTRAINT stripe_webhook_events_pkey PRIMARY KEY (id);


--
-- Name: stripe_webhook_events stripe_webhook_events_stripe_event_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_webhook_events
    ADD CONSTRAINT stripe_webhook_events_stripe_event_id_key UNIQUE (stripe_event_id);


--
-- Name: subscription_stipend_log subscription_stipend_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_stipend_log
    ADD CONSTRAINT subscription_stipend_log_pkey PRIMARY KEY (id);


--
-- Name: subscription_stipend_log subscription_stipend_log_subscription_id_period_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_stipend_log
    ADD CONSTRAINT subscription_stipend_log_subscription_id_period_key_key UNIQUE (subscription_id, period_key);


--
-- Name: support_attachments support_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_attachments
    ADD CONSTRAINT support_attachments_pkey PRIMARY KEY (id);


--
-- Name: support_replies support_replies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_replies
    ADD CONSTRAINT support_replies_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: titles titles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.titles
    ADD CONSTRAINT titles_name_key UNIQUE (name);


--
-- Name: titles titles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.titles
    ADD CONSTRAINT titles_pkey PRIMARY KEY (id);


--
-- Name: type_base_attack_types type_base_attack_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.type_base_attack_types
    ADD CONSTRAINT type_base_attack_types_pkey PRIMARY KEY (id);


--
-- Name: type_base_attack_types type_base_attack_types_type_base_id_attack_type_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.type_base_attack_types
    ADD CONSTRAINT type_base_attack_types_type_base_id_attack_type_id_key UNIQUE (type_base_id, attack_type_id);


--
-- Name: visual_behaviors visual_behaviors_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visual_behaviors
    ADD CONSTRAINT visual_behaviors_name_key UNIQUE (name);


--
-- Name: visual_behaviors visual_behaviors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visual_behaviors
    ADD CONSTRAINT visual_behaviors_pkey PRIMARY KEY (id);


--
-- Name: wave_preset_assignments wave_preset_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wave_preset_assignments
    ADD CONSTRAINT wave_preset_assignments_pkey PRIMARY KEY (id);


--
-- Name: wave_presets wave_presets_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wave_presets
    ADD CONSTRAINT wave_presets_name_key UNIQUE (name);


--
-- Name: wave_presets wave_presets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wave_presets
    ADD CONSTRAINT wave_presets_pkey PRIMARY KEY (id);


--
-- Name: idx_achievements_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_achievements_active ON public.achievements USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_achievements_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_achievements_category ON public.achievements USING btree (category);


--
-- Name: idx_achievements_name_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_achievements_name_unique ON public.achievements USING btree (name);


--
-- Name: idx_achievements_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_achievements_parent ON public.achievements USING btree (parent_achievement_id);


--
-- Name: idx_activity_events_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_events_created ON public.activity_events USING btree (created_at);


--
-- Name: idx_activity_events_player_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_events_player_id ON public.activity_events USING btree (player_id);


--
-- Name: idx_activity_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_events_type ON public.activity_events USING btree (event_type);


--
-- Name: idx_admin_audit_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_audit_action ON public.admin_audit_log USING btree (action);


--
-- Name: idx_admin_audit_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_audit_created ON public.admin_audit_log USING btree (created_at);


--
-- Name: idx_admin_essence_adj_character; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_essence_adj_character ON public.admin_essence_adjustments USING btree (character_id);


--
-- Name: idx_admin_essence_adj_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_essence_adj_created ON public.admin_essence_adjustments USING btree (created_at DESC);


--
-- Name: idx_admin_essence_adj_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_essence_adj_player ON public.admin_essence_adjustments USING btree (player_id);


--
-- Name: idx_ar_asset_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ar_asset_key ON public.asset_registry USING btree (asset_key);


--
-- Name: idx_ar_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ar_category ON public.asset_registry USING btree (category);


--
-- Name: idx_ar_display_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ar_display_name ON public.asset_registry USING btree (display_name);


--
-- Name: idx_ar_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ar_source ON public.asset_registry USING btree (source);


--
-- Name: idx_ar_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ar_tags ON public.asset_registry USING gin (tags);


--
-- Name: idx_asa_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asa_admin ON public.admin_shard_adjustments USING btree (admin_email);


--
-- Name: idx_asa_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asa_created ON public.admin_shard_adjustments USING btree (created_at DESC);


--
-- Name: idx_asa_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asa_player ON public.admin_shard_adjustments USING btree (player_id);


--
-- Name: idx_bundle_items_bundle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bundle_items_bundle ON public.shop_bundle_items USING btree (bundle_id, sort_order);


--
-- Name: idx_chapters_book_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chapters_book_id ON public.chapters USING btree (book_id);


--
-- Name: idx_chapters_processing_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chapters_processing_status ON public.chapters USING btree (processing_status);


--
-- Name: idx_curated_artifacts_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_curated_artifacts_active ON public.curated_artifacts USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_curated_artifacts_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_curated_artifacts_source ON public.curated_artifacts USING btree (source_type, source_id);


--
-- Name: idx_dev_content_audit_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dev_content_audit_status ON public.dev_content_audit USING btree (status);


--
-- Name: idx_dev_content_audit_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dev_content_audit_type ON public.dev_content_audit USING btree (audit_type);


--
-- Name: idx_donations_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_donations_created ON public.donations USING btree (created_at DESC);


--
-- Name: idx_donations_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_donations_player ON public.donations USING btree (player_id);


--
-- Name: idx_entities_entity_family_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entities_entity_family_id ON public.entities USING btree (entity_family_id);


--
-- Name: idx_entities_entity_type_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entities_entity_type_id ON public.entities USING btree (entity_type_id);


--
-- Name: idx_entity_beat_app_beat_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_beat_app_beat_id ON public.entity_beat_appearances USING btree (story_beat_id);


--
-- Name: idx_entity_beat_app_entity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_beat_app_entity_id ON public.entity_beat_appearances USING btree (entity_id);


--
-- Name: idx_entity_scene_app_entity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_scene_app_entity_id ON public.entity_scene_appearances USING btree (entity_id);


--
-- Name: idx_entity_scene_app_scene_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_scene_app_scene_id ON public.entity_scene_appearances USING btree (scene_id);


--
-- Name: idx_leaderboard_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leaderboard_category ON public.leaderboard_cache USING btree (category);


--
-- Name: idx_leaderboard_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leaderboard_player ON public.leaderboard_cache USING btree (player_id);


--
-- Name: idx_location_scene_app_location_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_location_scene_app_location_id ON public.location_scene_appearances USING btree (location_id);


--
-- Name: idx_location_scene_app_scene_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_location_scene_app_scene_id ON public.location_scene_appearances USING btree (scene_id);


--
-- Name: idx_mph_listing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mph_listing ON public.marketplace_price_history USING btree (listing_id);


--
-- Name: idx_mpl_buyer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mpl_buyer ON public.marketplace_listings USING btree (buyer_id) WHERE (buyer_id IS NOT NULL);


--
-- Name: idx_mpl_item_name_rarity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mpl_item_name_rarity ON public.marketplace_listings USING btree (item_name, item_rarity) WHERE ((status)::text = 'active'::text);


--
-- Name: idx_mpl_price; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mpl_price ON public.marketplace_listings USING btree (price_shards) WHERE ((status)::text = 'active'::text);


--
-- Name: idx_mpl_seller; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mpl_seller ON public.marketplace_listings USING btree (seller_id);


--
-- Name: idx_mpl_status_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mpl_status_expires ON public.marketplace_listings USING btree (status, expires_at) WHERE ((status)::text = 'active'::text);


--
-- Name: idx_mpn_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mpn_created ON public.marketplace_notifications USING btree (created_at);


--
-- Name: idx_mpn_player_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mpn_player_unread ON public.marketplace_notifications USING btree (player_id) WHERE (is_read = false);


--
-- Name: idx_mpt_buyer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mpt_buyer ON public.marketplace_trades USING btree (buyer_id);


--
-- Name: idx_mpt_listing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mpt_listing ON public.marketplace_trades USING btree (listing_id);


--
-- Name: idx_mpt_pending_claim; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mpt_pending_claim ON public.marketplace_trades USING btree (claim_status) WHERE ((claim_status)::text = 'pending'::text);


--
-- Name: idx_mpt_seller; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mpt_seller ON public.marketplace_trades USING btree (seller_id);


--
-- Name: idx_mpt_traded_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mpt_traded_at ON public.marketplace_trades USING btree (traded_at);


--
-- Name: idx_pa_marketplace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pa_marketplace ON public.player_artifacts USING btree (marketplace_listing_id) WHERE (marketplace_listing_id IS NOT NULL);


--
-- Name: idx_pab_player_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pab_player_active ON public.player_active_boosters USING btree (player_id, boost_type) WHERE ((status)::text = 'active'::text);


--
-- Name: idx_pab_player_history; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pab_player_history ON public.player_active_boosters USING btree (player_id, activated_at DESC);


--
-- Name: idx_payment_orders_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_orders_player ON public.payment_orders USING btree (player_id, created_at DESC);


--
-- Name: idx_payment_orders_player_package; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_orders_player_package ON public.payment_orders USING btree (player_id, package_id) WHERE ((status)::text = 'completed'::text);


--
-- Name: idx_payment_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_orders_status ON public.payment_orders USING btree (status) WHERE ((status)::text = 'pending'::text);


--
-- Name: idx_payment_orders_stripe_charge; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_orders_stripe_charge ON public.payment_orders USING btree (stripe_charge_id) WHERE (stripe_charge_id IS NOT NULL);


--
-- Name: idx_payment_orders_stripe_pi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_orders_stripe_pi ON public.payment_orders USING btree (stripe_payment_intent_id) WHERE (stripe_payment_intent_id IS NOT NULL);


--
-- Name: idx_pdl_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pdl_player ON public.player_discovery_log USING btree (player_id);


--
-- Name: idx_pdl_player_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pdl_player_type ON public.player_discovery_log USING btree (player_id, discovery_type);


--
-- Name: idx_ped_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ped_entity ON public.player_entity_discovery USING btree (entity_id);


--
-- Name: idx_ped_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ped_player ON public.player_entity_discovery USING btree (player_id);


--
-- Name: idx_ped_player_rank; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ped_player_rank ON public.player_entity_discovery USING btree (player_id, rank);


--
-- Name: idx_pi_marketplace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pi_marketplace ON public.player_inventory USING btree (marketplace_listing_id) WHERE (marketplace_listing_id IS NOT NULL);


--
-- Name: idx_player_achievements_completed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_player_achievements_completed ON public.player_achievements USING btree (player_id) WHERE (is_completed = true);


--
-- Name: idx_player_achievements_new; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_player_achievements_new ON public.player_achievements USING btree (player_id) WHERE (is_new = true);


--
-- Name: idx_player_achievements_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_player_achievements_player ON public.player_achievements USING btree (player_id);


--
-- Name: idx_player_artifacts_character; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_player_artifacts_character ON public.player_artifacts USING btree (character_id);


--
-- Name: idx_player_artifacts_curated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_player_artifacts_curated ON public.player_artifacts USING btree (curated_artifact_id) WHERE (curated_artifact_id IS NOT NULL);


--
-- Name: idx_player_artifacts_new; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_player_artifacts_new ON public.player_artifacts USING btree (player_id) WHERE (is_new = true);


--
-- Name: idx_player_artifacts_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_player_artifacts_player ON public.player_artifacts USING btree (player_id);


--
-- Name: idx_player_characters_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_player_characters_name ON public.player_characters USING btree (lower((character_name)::text));


--
-- Name: idx_player_characters_player_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_player_characters_player_id ON public.player_characters USING btree (player_id);


--
-- Name: idx_player_essence_character_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_player_essence_character_id ON public.player_essence USING btree (character_id);


--
-- Name: idx_player_essence_player_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_player_essence_player_id ON public.player_essence USING btree (player_id);


--
-- Name: idx_player_progress_character_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_player_progress_character_id ON public.player_progress USING btree (character_id);


--
-- Name: idx_player_progress_player_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_player_progress_player_id ON public.player_progress USING btree (player_id);


--
-- Name: idx_player_scene_records_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_player_scene_records_player ON public.player_scene_records USING btree (player_id);


--
-- Name: idx_players_alias; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_players_alias ON public.players USING btree (lower((alias)::text)) WHERE (alias IS NOT NULL);


--
-- Name: idx_players_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_players_email ON public.players USING btree (email);


--
-- Name: idx_players_firebase_uid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_players_firebase_uid ON public.players USING btree (firebase_uid);


--
-- Name: idx_players_is_ascendant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_players_is_ascendant ON public.players USING btree (is_ascendant) WHERE (is_ascendant = true);


--
-- Name: idx_players_roles; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_players_roles ON public.players USING btree (is_owner, is_system_admin, is_game_admin);


--
-- Name: idx_players_stripe_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_players_stripe_customer ON public.players USING btree (stripe_customer_id) WHERE (stripe_customer_id IS NOT NULL);


--
-- Name: idx_psi_player_bundle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_psi_player_bundle ON public.player_shop_items USING btree (player_id, source_bundle_id) WHERE (source_bundle_id IS NOT NULL);


--
-- Name: idx_psi_player_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_psi_player_item ON public.player_shop_items USING btree (player_id, shop_item_id) WHERE ((status)::text = 'owned'::text);


--
-- Name: idx_psi_player_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_psi_player_status ON public.player_shop_items USING btree (player_id, status) WHERE ((status)::text = 'owned'::text);


--
-- Name: idx_psi_unique_ownership; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_psi_unique_ownership ON public.player_shop_items USING btree (player_id, shop_item_id) WHERE (((status)::text = 'owned'::text) AND (shop_item_id IS NOT NULL));


--
-- Name: idx_psub_player_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_psub_player_created ON public.player_subscriptions USING btree (player_id, created_at DESC);


--
-- Name: idx_psub_player_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_psub_player_status ON public.player_subscriptions USING btree (player_id, status);


--
-- Name: idx_psub_status_grace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_psub_status_grace ON public.player_subscriptions USING btree (status, grace_deadline) WHERE ((status)::text = 'past_due'::text);


--
-- Name: idx_psub_stripe_sub; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_psub_stripe_sub ON public.player_subscriptions USING btree (stripe_subscription_id) WHERE (stripe_subscription_id IS NOT NULL);


--
-- Name: idx_review_items_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_review_items_status ON public.review_items USING btree (review_status);


--
-- Name: idx_scene_gameplay_data_background; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scene_gameplay_data_background ON public.scene_gameplay_data USING btree (background_id);


--
-- Name: idx_scene_wave_configs_scene; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scene_wave_configs_scene ON public.scene_wave_configs USING btree (scene_id);


--
-- Name: idx_scenes_chapter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scenes_chapter_id ON public.scenes USING btree (chapter_id);


--
-- Name: idx_scenes_primary_location_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scenes_primary_location_id ON public.scenes USING btree (primary_location_id);


--
-- Name: idx_semantic_tags_beat_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_semantic_tags_beat_id ON public.semantic_tags USING btree (story_beat_id);


--
-- Name: idx_semantic_tags_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_semantic_tags_category ON public.semantic_tags USING btree (category);


--
-- Name: idx_shard_packages_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shard_packages_active ON public.shard_packages USING btree (is_active, sort_order) WHERE (is_active = true);


--
-- Name: idx_shard_transactions_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shard_transactions_player ON public.shard_transactions USING btree (player_id);


--
-- Name: idx_shard_transactions_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shard_transactions_source ON public.shard_transactions USING btree (source_type);


--
-- Name: idx_shop_bundles_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shop_bundles_active ON public.shop_bundles USING btree (is_active, sort_order) WHERE (is_active = true);


--
-- Name: idx_shop_items_availability; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shop_items_availability ON public.shop_items USING btree (available_from, available_until) WHERE (available_until IS NOT NULL);


--
-- Name: idx_shop_items_category_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shop_items_category_active ON public.shop_items USING btree (category, sort_order) WHERE (is_active = true);


--
-- Name: idx_shop_items_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shop_items_featured ON public.shop_items USING btree (is_featured, featured_from, featured_until) WHERE (is_featured = true);


--
-- Name: idx_skill_prerequisites_skill_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_skill_prerequisites_skill_id ON public.skill_prerequisites USING btree (skill_id);


--
-- Name: idx_stipend_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stipend_invoice ON public.subscription_stipend_log USING btree (stripe_invoice_id) WHERE (stripe_invoice_id IS NOT NULL);


--
-- Name: idx_stipend_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stipend_player ON public.subscription_stipend_log USING btree (player_id, created_at DESC);


--
-- Name: idx_story_beats_location_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_beats_location_id ON public.story_beats USING btree (location_id);


--
-- Name: idx_story_beats_scene_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_beats_scene_id ON public.story_beats USING btree (scene_id);


--
-- Name: idx_stripe_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_events_type ON public.stripe_webhook_events USING btree (event_type, created_at DESC);


--
-- Name: idx_stripe_events_unprocessed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_events_unprocessed ON public.stripe_webhook_events USING btree (processed) WHERE (processed = false);


--
-- Name: idx_support_replies_ticket_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_replies_ticket_id ON public.support_replies USING btree (ticket_id);


--
-- Name: idx_support_tickets_assigned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_assigned ON public.support_tickets USING btree (assigned_admin);


--
-- Name: idx_support_tickets_player_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_player_id ON public.support_tickets USING btree (player_id);


--
-- Name: idx_support_tickets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_status ON public.support_tickets USING btree (status);


--
-- Name: idx_wpa_unique_book; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_wpa_unique_book ON public.wave_preset_assignments USING btree (book_id) WHERE (book_id IS NOT NULL);


--
-- Name: idx_wpa_unique_chapter; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_wpa_unique_chapter ON public.wave_preset_assignments USING btree (chapter_id) WHERE (chapter_id IS NOT NULL);


--
-- Name: idx_wpa_wave_preset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wpa_wave_preset_id ON public.wave_preset_assignments USING btree (wave_preset_id);


--
-- Name: uix_character_one_active_training; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uix_character_one_active_training ON public.character_skill_levels USING btree (character_id) WHERE (is_active_training = true);


--
-- Name: uq_boss_completion; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_boss_completion ON public.boss_completions USING btree (player_id, scene_id);


--
-- Name: uq_player_curated_artifact; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_player_curated_artifact ON public.player_artifacts USING btree (character_id, curated_artifact_id) WHERE (curated_artifact_id IS NOT NULL);


--
-- Name: uq_player_generated_artifact; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_player_generated_artifact ON public.player_artifacts USING btree (character_id, artifact_code) WHERE (artifact_code IS NOT NULL);


--
-- Name: achievements trg_achievements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_achievements_updated_at BEFORE UPDATE ON public.achievements FOR EACH ROW EXECUTE FUNCTION public.update_achievements_updated_at();


--
-- Name: asset_registry trg_asset_registry_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_asset_registry_updated_at BEFORE UPDATE ON public.asset_registry FOR EACH ROW EXECUTE FUNCTION public.trg_asset_registry_updated_at();


--
-- Name: curated_artifacts trg_curated_artifacts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_curated_artifacts_updated_at BEFORE UPDATE ON public.curated_artifacts FOR EACH ROW EXECUTE FUNCTION public.update_curated_artifacts_updated_at();


--
-- Name: player_inventory trg_enforce_inventory_slot_cap; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_enforce_inventory_slot_cap BEFORE INSERT ON public.player_inventory FOR EACH ROW EXECUTE FUNCTION public.enforce_inventory_slot_cap();


--
-- Name: item_prefixes trg_item_prefixes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_item_prefixes_updated_at BEFORE UPDATE ON public.item_prefixes FOR EACH ROW EXECUTE FUNCTION public.update_item_prefixes_updated_at();


--
-- Name: item_suffixes trg_item_suffixes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_item_suffixes_updated_at BEFORE UPDATE ON public.item_suffixes FOR EACH ROW EXECUTE FUNCTION public.update_item_suffixes_updated_at();


--
-- Name: item_type_bases trg_item_type_bases_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_item_type_bases_updated_at BEFORE UPDATE ON public.item_type_bases FOR EACH ROW EXECUTE FUNCTION public.update_item_type_bases_updated_at();


--
-- Name: player_active_boosters trg_player_active_boosters_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_player_active_boosters_updated_at BEFORE UPDATE ON public.player_active_boosters FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- Name: player_subscriptions trg_player_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_player_subscriptions_updated_at BEFORE UPDATE ON public.player_subscriptions FOR EACH ROW EXECUTE FUNCTION public.trg_player_subscriptions_updated_at_fn();


--
-- Name: shard_packages trg_shard_packages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_shard_packages_updated_at BEFORE UPDATE ON public.shard_packages FOR EACH ROW EXECUTE FUNCTION public.update_shard_packages_updated_at();


--
-- Name: shop_bundles trg_shop_bundles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_shop_bundles_updated_at BEFORE UPDATE ON public.shop_bundles FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- Name: shop_items trg_shop_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_shop_items_updated_at BEFORE UPDATE ON public.shop_items FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- Name: atmospheres update_atmospheres_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_atmospheres_modtime BEFORE UPDATE ON public.atmospheres FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: audio_configs update_audio_configs_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_audio_configs_modtime BEFORE UPDATE ON public.audio_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: backgrounds update_backgrounds_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_backgrounds_modtime BEFORE UPDATE ON public.backgrounds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: books update_books_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_books_modtime BEFORE UPDATE ON public.books FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: chapters update_chapters_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_chapters_modtime BEFORE UPDATE ON public.chapters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: character_classes update_character_classes_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_character_classes_modtime BEFORE UPDATE ON public.character_classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: class_stat_affinities update_class_stat_affinities_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_class_stat_affinities_modtime BEFORE UPDATE ON public.class_stat_affinities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: difficulty_curves update_difficulty_curves_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_difficulty_curves_modtime BEFORE UPDATE ON public.difficulty_curves FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: difficulty_presets update_difficulty_presets_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_difficulty_presets_modtime BEFORE UPDATE ON public.difficulty_presets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: entities update_entities_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_entities_modtime BEFORE UPDATE ON public.entities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: entity_families update_entity_families_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_entity_families_modtime BEFORE UPDATE ON public.entity_families FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: entity_scene_appearances update_entity_scene_appearances_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_entity_scene_appearances_modtime BEFORE UPDATE ON public.entity_scene_appearances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: entity_types update_entity_types_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_entity_types_modtime BEFORE UPDATE ON public.entity_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: game_configs update_game_configs_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_game_configs_modtime BEFORE UPDATE ON public.game_configs FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- Name: idle_skill_stat_contributions update_idle_skill_stat_contributions_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_idle_skill_stat_contributions_modtime BEFORE UPDATE ON public.idle_skill_stat_contributions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: location_scene_appearances update_location_scene_appearances_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_location_scene_appearances_modtime BEFORE UPDATE ON public.location_scene_appearances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: locations update_locations_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_locations_modtime BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: player_characters update_player_characters_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_player_characters_modtime BEFORE UPDATE ON public.player_characters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: player_meta_progression update_player_meta_progression_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_player_meta_progression_modtime BEFORE UPDATE ON public.player_meta_progression FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- Name: player_scene_records update_player_scene_records_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_player_scene_records_modtime BEFORE UPDATE ON public.player_scene_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: player_settings update_player_settings_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_player_settings_modtime BEFORE UPDATE ON public.player_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: player_story_sessions update_player_story_sessions_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_player_story_sessions_modtime BEFORE UPDATE ON public.player_story_sessions FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_column();


--
-- Name: players update_players_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_players_modtime BEFORE UPDATE ON public.players FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: review_items update_review_items_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_review_items_modtime BEFORE UPDATE ON public.review_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: scene_wave_configs update_scene_wave_configs_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_scene_wave_configs_modtime BEFORE UPDATE ON public.scene_wave_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: scenes update_scenes_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_scenes_modtime BEFORE UPDATE ON public.scenes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: semantic_tags update_semantic_tags_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_semantic_tags_modtime BEFORE UPDATE ON public.semantic_tags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: server_config update_server_config_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_server_config_modtime BEFORE UPDATE ON public.server_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: story_beats update_story_beats_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_story_beats_modtime BEFORE UPDATE ON public.story_beats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: support_tickets update_support_tickets_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_support_tickets_modtime BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: visual_behaviors update_visual_behaviors_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_visual_behaviors_modtime BEFORE UPDATE ON public.visual_behaviors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: wave_preset_assignments update_wave_preset_assignments_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_wave_preset_assignments_modtime BEFORE UPDATE ON public.wave_preset_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: wave_presets update_wave_presets_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_wave_presets_modtime BEFORE UPDATE ON public.wave_presets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: achievements achievements_parent_achievement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_parent_achievement_id_fkey FOREIGN KEY (parent_achievement_id) REFERENCES public.achievements(id) ON DELETE SET NULL;


--
-- Name: achievements achievements_reward_title_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_reward_title_id_fkey FOREIGN KEY (reward_title_id) REFERENCES public.titles(id) ON DELETE SET NULL;


--
-- Name: activity_events activity_events_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_events
    ADD CONSTRAINT activity_events_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: admin_essence_adjustments admin_essence_adjustments_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_essence_adjustments
    ADD CONSTRAINT admin_essence_adjustments_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.player_characters(id) ON DELETE CASCADE;


--
-- Name: admin_essence_adjustments admin_essence_adjustments_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_essence_adjustments
    ADD CONSTRAINT admin_essence_adjustments_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: admin_shard_adjustments admin_shard_adjustments_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_shard_adjustments
    ADD CONSTRAINT admin_shard_adjustments_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: admin_shard_adjustments admin_shard_adjustments_shard_txn_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_shard_adjustments
    ADD CONSTRAINT admin_shard_adjustments_shard_txn_id_fkey FOREIGN KEY (shard_txn_id) REFERENCES public.shard_transactions(id) ON DELETE SET NULL;


--
-- Name: attack_types attack_types_visual_behavior_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attack_types
    ADD CONSTRAINT attack_types_visual_behavior_id_fkey FOREIGN KEY (visual_behavior_id) REFERENCES public.visual_behaviors(id) ON DELETE SET NULL;


--
-- Name: books books_atmosphere_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_atmosphere_id_fkey FOREIGN KEY (atmosphere_id) REFERENCES public.atmospheres(id) ON DELETE SET NULL;


--
-- Name: books books_difficulty_curve_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_difficulty_curve_id_fkey FOREIGN KEY (difficulty_curve_id) REFERENCES public.difficulty_curves(id) ON DELETE SET NULL;


--
-- Name: boss_completions boss_completions_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boss_completions
    ADD CONSTRAINT boss_completions_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE SET NULL;


--
-- Name: boss_completions boss_completions_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boss_completions
    ADD CONSTRAINT boss_completions_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE SET NULL;


--
-- Name: boss_completions boss_completions_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boss_completions
    ADD CONSTRAINT boss_completions_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: boss_completions boss_completions_scene_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boss_completions
    ADD CONSTRAINT boss_completions_scene_id_fkey FOREIGN KEY (scene_id) REFERENCES public.scenes(id) ON DELETE CASCADE;


--
-- Name: chapters chapters_atmosphere_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapters
    ADD CONSTRAINT chapters_atmosphere_id_fkey FOREIGN KEY (atmosphere_id) REFERENCES public.atmospheres(id) ON DELETE SET NULL;


--
-- Name: chapters chapters_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chapters
    ADD CONSTRAINT chapters_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;


--
-- Name: character_skill_levels character_skill_levels_active_action_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_skill_levels
    ADD CONSTRAINT character_skill_levels_active_action_id_fkey FOREIGN KEY (active_action_id) REFERENCES public.skill_actions(id) ON DELETE SET NULL;


--
-- Name: character_skill_levels character_skill_levels_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_skill_levels
    ADD CONSTRAINT character_skill_levels_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.player_characters(id) ON DELETE CASCADE;


--
-- Name: character_skill_levels character_skill_levels_skill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_skill_levels
    ADD CONSTRAINT character_skill_levels_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES public.skills(id) ON DELETE CASCADE;


--
-- Name: character_stats character_stats_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_stats
    ADD CONSTRAINT character_stats_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.player_characters(id) ON DELETE CASCADE;


--
-- Name: character_stats character_stats_stat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_stats
    ADD CONSTRAINT character_stats_stat_id_fkey FOREIGN KEY (stat_id) REFERENCES public.stat_definitions(id) ON DELETE CASCADE;


--
-- Name: chat_channels chat_channels_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_channels
    ADD CONSTRAINT chat_channels_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: class_stat_affinities class_stat_affinities_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_stat_affinities
    ADD CONSTRAINT class_stat_affinities_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.character_classes(id) ON DELETE CASCADE;


--
-- Name: class_stat_affinities class_stat_affinities_stat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_stat_affinities
    ADD CONSTRAINT class_stat_affinities_stat_id_fkey FOREIGN KEY (stat_id) REFERENCES public.stat_definitions(id) ON DELETE CASCADE;


--
-- Name: curated_artifact_tiers curated_artifact_tiers_curated_artifact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curated_artifact_tiers
    ADD CONSTRAINT curated_artifact_tiers_curated_artifact_id_fkey FOREIGN KEY (curated_artifact_id) REFERENCES public.curated_artifacts(id) ON DELETE CASCADE;


--
-- Name: dev_content_audit dev_content_audit_scene_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dev_content_audit
    ADD CONSTRAINT dev_content_audit_scene_id_fkey FOREIGN KEY (scene_id) REFERENCES public.scenes(id) ON DELETE SET NULL;


--
-- Name: difficulty_presets difficulty_presets_difficulty_curve_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.difficulty_presets
    ADD CONSTRAINT difficulty_presets_difficulty_curve_id_fkey FOREIGN KEY (difficulty_curve_id) REFERENCES public.difficulty_curves(id) ON DELETE SET NULL;


--
-- Name: difficulty_presets difficulty_presets_wave_preset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.difficulty_presets
    ADD CONSTRAINT difficulty_presets_wave_preset_id_fkey FOREIGN KEY (wave_preset_id) REFERENCES public.wave_presets(id) ON DELETE SET NULL;


--
-- Name: donations donations_payment_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donations
    ADD CONSTRAINT donations_payment_order_id_fkey FOREIGN KEY (payment_order_id) REFERENCES public.payment_orders(id);


--
-- Name: donations donations_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donations
    ADD CONSTRAINT donations_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id);


--
-- Name: entities entities_entity_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entities
    ADD CONSTRAINT entities_entity_family_id_fkey FOREIGN KEY (entity_family_id) REFERENCES public.entity_families(id) ON DELETE SET NULL;


--
-- Name: entities entities_entity_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entities
    ADD CONSTRAINT entities_entity_type_id_fkey FOREIGN KEY (entity_type_id) REFERENCES public.entity_types(id) ON DELETE RESTRICT;


--
-- Name: entities entities_first_appearance_scene_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entities
    ADD CONSTRAINT entities_first_appearance_scene_id_fkey FOREIGN KEY (first_appearance_scene_id) REFERENCES public.scenes(id) ON DELETE SET NULL;


--
-- Name: entity_aliases entity_aliases_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_aliases
    ADD CONSTRAINT entity_aliases_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id) ON DELETE CASCADE;


--
-- Name: entity_attack_types entity_attack_types_attack_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_attack_types
    ADD CONSTRAINT entity_attack_types_attack_type_id_fkey FOREIGN KEY (attack_type_id) REFERENCES public.attack_types(id) ON DELETE CASCADE;


--
-- Name: entity_attack_types entity_attack_types_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_attack_types
    ADD CONSTRAINT entity_attack_types_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id) ON DELETE CASCADE;


--
-- Name: entity_beat_appearances entity_beat_appearances_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_beat_appearances
    ADD CONSTRAINT entity_beat_appearances_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id) ON DELETE CASCADE;


--
-- Name: entity_beat_appearances entity_beat_appearances_story_beat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_beat_appearances
    ADD CONSTRAINT entity_beat_appearances_story_beat_id_fkey FOREIGN KEY (story_beat_id) REFERENCES public.story_beats(id) ON DELETE CASCADE;


--
-- Name: entity_gameplay_data entity_gameplay_data_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_gameplay_data
    ADD CONSTRAINT entity_gameplay_data_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id) ON DELETE CASCADE;


--
-- Name: entity_gameplay_data entity_gameplay_data_unique_boss_theme_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_gameplay_data
    ADD CONSTRAINT entity_gameplay_data_unique_boss_theme_id_fkey FOREIGN KEY (unique_boss_theme_id) REFERENCES public.atmospheres(id) ON DELETE SET NULL;


--
-- Name: entity_gameplay_data entity_gameplay_data_movement_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_gameplay_data
    ADD CONSTRAINT entity_gameplay_data_movement_type_id_fkey FOREIGN KEY (movement_type_id) REFERENCES public.movement_types(id);


--
-- Name: entity_gameplay_data entity_gameplay_data_size_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_gameplay_data
    ADD CONSTRAINT entity_gameplay_data_size_class_id_fkey FOREIGN KEY (size_class_id) REFERENCES public.size_classes(id);


--
-- Name: entity_gameplay_data entity_gameplay_data_animation_style_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_gameplay_data
    ADD CONSTRAINT entity_gameplay_data_animation_style_id_fkey FOREIGN KEY (animation_style_id) REFERENCES public.animation_styles(id);


--
-- Name: entity_gameplay_data entity_gameplay_data_silhouette_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_gameplay_data
    ADD CONSTRAINT entity_gameplay_data_silhouette_type_id_fkey FOREIGN KEY (silhouette_type_id) REFERENCES public.silhouette_types(id);


--
-- Name: entity_gameplay_data entity_gameplay_data_primary_attack_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_gameplay_data
    ADD CONSTRAINT entity_gameplay_data_primary_attack_type_id_fkey FOREIGN KEY (primary_attack_type_id) REFERENCES public.attack_types(id);


--
-- Name: entity_gameplay_data entity_gameplay_data_secondary_attack_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_gameplay_data
    ADD CONSTRAINT entity_gameplay_data_secondary_attack_type_id_fkey FOREIGN KEY (secondary_attack_type_id) REFERENCES public.attack_types(id);


--
-- Name: entity_gameplay_data entity_gameplay_data_tertiary_attack_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_gameplay_data
    ADD CONSTRAINT entity_gameplay_data_tertiary_attack_type_id_fkey FOREIGN KEY (tertiary_attack_type_id) REFERENCES public.attack_types(id);


--
-- Name: entity_scene_appearances entity_scene_appearances_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_scene_appearances
    ADD CONSTRAINT entity_scene_appearances_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id) ON DELETE CASCADE;


--
-- Name: entity_scene_appearances entity_scene_appearances_scene_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_scene_appearances
    ADD CONSTRAINT entity_scene_appearances_scene_id_fkey FOREIGN KEY (scene_id) REFERENCES public.scenes(id) ON DELETE CASCADE;


--
-- Name: locations fk_locations_first_appearance_scene; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT fk_locations_first_appearance_scene FOREIGN KEY (first_appearance_scene_id) REFERENCES public.scenes(id) ON DELETE SET NULL;


--
-- Name: game_configs game_configs_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_configs
    ADD CONSTRAINT game_configs_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: idle_skill_stat_contributions idle_skill_stat_contributions_idle_skill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.idle_skill_stat_contributions
    ADD CONSTRAINT idle_skill_stat_contributions_idle_skill_id_fkey FOREIGN KEY (idle_skill_id) REFERENCES public.skills(id) ON DELETE CASCADE;


--
-- Name: idle_skill_stat_contributions idle_skill_stat_contributions_stat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.idle_skill_stat_contributions
    ADD CONSTRAINT idle_skill_stat_contributions_stat_id_fkey FOREIGN KEY (stat_id) REFERENCES public.stat_definitions(id) ON DELETE CASCADE;


--
-- Name: inventory_items inventory_items_gear_slot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_gear_slot_id_fkey FOREIGN KEY (gear_slot_id) REFERENCES public.gear_slots(id) ON DELETE SET NULL;


--
-- Name: item_type_bases item_type_bases_gear_slot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_type_bases
    ADD CONSTRAINT item_type_bases_gear_slot_id_fkey FOREIGN KEY (gear_slot_id) REFERENCES public.gear_slots(id) ON DELETE RESTRICT;


--
-- Name: item_type_bases item_type_bases_armor_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_type_bases
    ADD CONSTRAINT item_type_bases_armor_class_id_fkey FOREIGN KEY (armor_class_id) REFERENCES public.armor_classes(id);


--
-- Name: leaderboard_cache leaderboard_cache_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leaderboard_cache
    ADD CONSTRAINT leaderboard_cache_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: location_aliases location_aliases_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location_aliases
    ADD CONSTRAINT location_aliases_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE;


--
-- Name: location_scene_appearances location_scene_appearances_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location_scene_appearances
    ADD CONSTRAINT location_scene_appearances_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE;


--
-- Name: location_scene_appearances location_scene_appearances_scene_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location_scene_appearances
    ADD CONSTRAINT location_scene_appearances_scene_id_fkey FOREIGN KEY (scene_id) REFERENCES public.scenes(id) ON DELETE CASCADE;


--
-- Name: locations locations_archetype_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_archetype_id_fkey FOREIGN KEY (archetype_id) REFERENCES public.atmospheres(id) ON DELETE SET NULL;


--
-- Name: marketplace_listings marketplace_listings_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_listings
    ADD CONSTRAINT marketplace_listings_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: marketplace_listings marketplace_listings_item_gear_slot_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_listings
    ADD CONSTRAINT marketplace_listings_item_gear_slot_fkey FOREIGN KEY (item_gear_slot) REFERENCES public.gear_slots(id) ON DELETE SET NULL;


--
-- Name: marketplace_listings marketplace_listings_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_listings
    ADD CONSTRAINT marketplace_listings_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: marketplace_notifications marketplace_notifications_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_notifications
    ADD CONSTRAINT marketplace_notifications_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: marketplace_notifications marketplace_notifications_related_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_notifications
    ADD CONSTRAINT marketplace_notifications_related_listing_id_fkey FOREIGN KEY (related_listing_id) REFERENCES public.marketplace_listings(id) ON DELETE SET NULL;


--
-- Name: marketplace_price_history marketplace_price_history_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_price_history
    ADD CONSTRAINT marketplace_price_history_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.marketplace_listings(id) ON DELETE CASCADE;


--
-- Name: marketplace_trades marketplace_trades_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_trades
    ADD CONSTRAINT marketplace_trades_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: marketplace_trades marketplace_trades_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_trades
    ADD CONSTRAINT marketplace_trades_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.marketplace_listings(id) ON DELETE CASCADE;


--
-- Name: marketplace_trades marketplace_trades_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_trades
    ADD CONSTRAINT marketplace_trades_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: payment_orders payment_orders_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_orders
    ADD CONSTRAINT payment_orders_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.shard_packages(id) ON DELETE RESTRICT;


--
-- Name: payment_orders payment_orders_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_orders
    ADD CONSTRAINT payment_orders_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: player_achievements player_achievements_achievement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_achievements
    ADD CONSTRAINT player_achievements_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(id) ON DELETE CASCADE;


--
-- Name: player_achievements player_achievements_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_achievements
    ADD CONSTRAINT player_achievements_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: player_active_boosters player_active_boosters_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_active_boosters
    ADD CONSTRAINT player_active_boosters_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: player_active_boosters player_active_boosters_shop_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_active_boosters
    ADD CONSTRAINT player_active_boosters_shop_item_id_fkey FOREIGN KEY (shop_item_id) REFERENCES public.shop_items(id) ON DELETE SET NULL;


--
-- Name: player_artifacts player_artifacts_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_artifacts
    ADD CONSTRAINT player_artifacts_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.player_characters(id) ON DELETE CASCADE;


--
-- Name: player_artifacts player_artifacts_curated_artifact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_artifacts
    ADD CONSTRAINT player_artifacts_curated_artifact_id_fkey FOREIGN KEY (curated_artifact_id) REFERENCES public.curated_artifacts(id) ON DELETE SET NULL;


--
-- Name: player_artifacts player_artifacts_marketplace_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_artifacts
    ADD CONSTRAINT player_artifacts_marketplace_listing_id_fkey FOREIGN KEY (marketplace_listing_id) REFERENCES public.marketplace_listings(id) ON DELETE SET NULL;


--
-- Name: player_artifacts player_artifacts_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_artifacts
    ADD CONSTRAINT player_artifacts_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: player_characters player_characters_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_characters
    ADD CONSTRAINT player_characters_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.character_classes(id) ON DELETE RESTRICT;


--
-- Name: player_characters player_characters_equipped_title_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_characters
    ADD CONSTRAINT player_characters_equipped_title_id_fkey FOREIGN KEY (equipped_title_id) REFERENCES public.titles(id) ON DELETE SET NULL;


--
-- Name: player_characters player_characters_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_characters
    ADD CONSTRAINT player_characters_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: player_collections_legacy player_collections_artifact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_collections_legacy
    ADD CONSTRAINT player_collections_artifact_id_fkey FOREIGN KEY (artifact_id) REFERENCES public.artifacts_legacy(id) ON DELETE CASCADE;


--
-- Name: player_collections_legacy player_collections_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_collections_legacy
    ADD CONSTRAINT player_collections_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.player_characters(id) ON DELETE CASCADE;


--
-- Name: player_discovery_log player_discovery_log_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_discovery_log
    ADD CONSTRAINT player_discovery_log_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: player_entity_discovery player_entity_discovery_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_entity_discovery
    ADD CONSTRAINT player_entity_discovery_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id) ON DELETE CASCADE;


--
-- Name: player_entity_discovery player_entity_discovery_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_entity_discovery
    ADD CONSTRAINT player_entity_discovery_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: player_essence player_essence_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_essence
    ADD CONSTRAINT player_essence_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.player_characters(id) ON DELETE CASCADE;


--
-- Name: player_essence player_essence_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_essence
    ADD CONSTRAINT player_essence_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: player_inventory player_inventory_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_inventory
    ADD CONSTRAINT player_inventory_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.player_characters(id) ON DELETE CASCADE;


--
-- Name: player_inventory player_inventory_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_inventory
    ADD CONSTRAINT player_inventory_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;


--
-- Name: player_inventory player_inventory_marketplace_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_inventory
    ADD CONSTRAINT player_inventory_marketplace_listing_id_fkey FOREIGN KEY (marketplace_listing_id) REFERENCES public.marketplace_listings(id) ON DELETE SET NULL;


--
-- Name: player_meta_progression player_meta_progression_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_meta_progression
    ADD CONSTRAINT player_meta_progression_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: player_progress player_progress_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_progress
    ADD CONSTRAINT player_progress_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.player_characters(id) ON DELETE CASCADE;


--
-- Name: player_progress player_progress_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_progress
    ADD CONSTRAINT player_progress_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: player_scene_records player_scene_records_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_scene_records
    ADD CONSTRAINT player_scene_records_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: player_scene_records player_scene_records_scene_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_scene_records
    ADD CONSTRAINT player_scene_records_scene_id_fkey FOREIGN KEY (scene_id) REFERENCES public.scenes(id) ON DELETE CASCADE;


--
-- Name: player_settings player_settings_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_settings
    ADD CONSTRAINT player_settings_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: player_shop_items player_shop_items_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_shop_items
    ADD CONSTRAINT player_shop_items_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: player_shop_items player_shop_items_shop_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_shop_items
    ADD CONSTRAINT player_shop_items_shop_item_id_fkey FOREIGN KEY (shop_item_id) REFERENCES public.shop_items(id) ON DELETE SET NULL;


--
-- Name: player_shop_items player_shop_items_source_bundle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_shop_items
    ADD CONSTRAINT player_shop_items_source_bundle_id_fkey FOREIGN KEY (source_bundle_id) REFERENCES public.shop_bundles(id) ON DELETE SET NULL;


--
-- Name: player_story_sessions player_story_sessions_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_story_sessions
    ADD CONSTRAINT player_story_sessions_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: player_story_sessions player_story_sessions_scene_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_story_sessions
    ADD CONSTRAINT player_story_sessions_scene_id_fkey FOREIGN KEY (scene_id) REFERENCES public.scenes(id);


--
-- Name: player_subscriptions player_subscriptions_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_subscriptions
    ADD CONSTRAINT player_subscriptions_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: player_titles player_titles_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_titles
    ADD CONSTRAINT player_titles_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: player_titles player_titles_title_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_titles
    ADD CONSTRAINT player_titles_title_id_fkey FOREIGN KEY (title_id) REFERENCES public.titles(id) ON DELETE CASCADE;


--
-- Name: processing_runs processing_runs_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processing_runs
    ADD CONSTRAINT processing_runs_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;


--
-- Name: processing_runs processing_runs_last_completed_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processing_runs
    ADD CONSTRAINT processing_runs_last_completed_chapter_id_fkey FOREIGN KEY (last_completed_chapter_id) REFERENCES public.chapters(id);


--
-- Name: review_items review_items_affected_beat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_items
    ADD CONSTRAINT review_items_affected_beat_id_fkey FOREIGN KEY (affected_beat_id) REFERENCES public.story_beats(id) ON DELETE SET NULL;


--
-- Name: review_items review_items_affected_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_items
    ADD CONSTRAINT review_items_affected_entity_id_fkey FOREIGN KEY (affected_entity_id) REFERENCES public.entities(id) ON DELETE SET NULL;


--
-- Name: review_items review_items_affected_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_items
    ADD CONSTRAINT review_items_affected_location_id_fkey FOREIGN KEY (affected_location_id) REFERENCES public.locations(id) ON DELETE SET NULL;


--
-- Name: review_items review_items_affected_scene_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_items
    ADD CONSTRAINT review_items_affected_scene_id_fkey FOREIGN KEY (affected_scene_id) REFERENCES public.scenes(id) ON DELETE SET NULL;


--
-- Name: scene_audio_sync scene_audio_sync_scene_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scene_audio_sync
    ADD CONSTRAINT scene_audio_sync_scene_id_fkey FOREIGN KEY (scene_id) REFERENCES public.scenes(id) ON DELETE CASCADE;


--
-- Name: scene_gameplay_data scene_gameplay_data_atmosphere_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scene_gameplay_data
    ADD CONSTRAINT scene_gameplay_data_atmosphere_id_fkey FOREIGN KEY (atmosphere_id) REFERENCES public.atmospheres(id) ON DELETE SET NULL;


--
-- Name: scene_gameplay_data scene_gameplay_data_background_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scene_gameplay_data
    ADD CONSTRAINT scene_gameplay_data_background_id_fkey FOREIGN KEY (background_id) REFERENCES public.backgrounds(id) ON DELETE SET NULL;


--
-- Name: scene_gameplay_data scene_gameplay_data_scene_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scene_gameplay_data
    ADD CONSTRAINT scene_gameplay_data_scene_id_fkey FOREIGN KEY (scene_id) REFERENCES public.scenes(id) ON DELETE CASCADE;


--
-- Name: scene_wave_configs scene_wave_configs_boss_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scene_wave_configs
    ADD CONSTRAINT scene_wave_configs_boss_entity_id_fkey FOREIGN KEY (boss_entity_id) REFERENCES public.entities(id) ON DELETE SET NULL;


--
-- Name: scene_wave_configs scene_wave_configs_scene_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scene_wave_configs
    ADD CONSTRAINT scene_wave_configs_scene_id_fkey FOREIGN KEY (scene_id) REFERENCES public.scenes(id) ON DELETE CASCADE;


--
-- Name: scenes scenes_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenes
    ADD CONSTRAINT scenes_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: scenes scenes_primary_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenes
    ADD CONSTRAINT scenes_primary_location_id_fkey FOREIGN KEY (primary_location_id) REFERENCES public.locations(id);


--
-- Name: semantic_tags semantic_tags_story_beat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.semantic_tags
    ADD CONSTRAINT semantic_tags_story_beat_id_fkey FOREIGN KEY (story_beat_id) REFERENCES public.story_beats(id) ON DELETE CASCADE;


--
-- Name: session_upgrades session_upgrades_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_upgrades
    ADD CONSTRAINT session_upgrades_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.player_story_sessions(id) ON DELETE CASCADE;


--
-- Name: shard_transactions shard_transactions_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shard_transactions
    ADD CONSTRAINT shard_transactions_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: shop_bundle_items shop_bundle_items_bundle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_bundle_items
    ADD CONSTRAINT shop_bundle_items_bundle_id_fkey FOREIGN KEY (bundle_id) REFERENCES public.shop_bundles(id) ON DELETE CASCADE;


--
-- Name: shop_bundle_items shop_bundle_items_shop_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_bundle_items
    ADD CONSTRAINT shop_bundle_items_shop_item_id_fkey FOREIGN KEY (shop_item_id) REFERENCES public.shop_items(id) ON DELETE CASCADE;


--
-- Name: shop_items shop_items_class_restriction_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_items
    ADD CONSTRAINT shop_items_class_restriction_fkey FOREIGN KEY (class_restriction) REFERENCES public.character_classes(id) ON DELETE SET NULL;


--
-- Name: skill_actions skill_actions_skill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skill_actions
    ADD CONSTRAINT skill_actions_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES public.skills(id) ON DELETE CASCADE;


--
-- Name: skill_prerequisites skill_prerequisites_skill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skill_prerequisites
    ADD CONSTRAINT skill_prerequisites_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES public.skills(id) ON DELETE CASCADE;


--
-- Name: skills skills_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.character_classes(id) ON DELETE SET NULL;


--
-- Name: skills skills_unlock_scene_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_unlock_scene_id_fkey FOREIGN KEY (unlock_scene_id) REFERENCES public.scenes(id) ON DELETE SET NULL;


--
-- Name: story_beats story_beats_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_beats
    ADD CONSTRAINT story_beats_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id);


--
-- Name: story_beats story_beats_scene_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_beats
    ADD CONSTRAINT story_beats_scene_id_fkey FOREIGN KEY (scene_id) REFERENCES public.scenes(id) ON DELETE CASCADE;


--
-- Name: subscription_stipend_log subscription_stipend_log_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_stipend_log
    ADD CONSTRAINT subscription_stipend_log_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: subscription_stipend_log subscription_stipend_log_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_stipend_log
    ADD CONSTRAINT subscription_stipend_log_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.player_subscriptions(id) ON DELETE CASCADE;


--
-- Name: support_attachments support_attachments_reply_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_attachments
    ADD CONSTRAINT support_attachments_reply_id_fkey FOREIGN KEY (reply_id) REFERENCES public.support_replies(id) ON DELETE CASCADE;


--
-- Name: support_attachments support_attachments_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_attachments
    ADD CONSTRAINT support_attachments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;


--
-- Name: support_attachments support_attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_attachments
    ADD CONSTRAINT support_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: support_replies support_replies_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_replies
    ADD CONSTRAINT support_replies_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;


--
-- Name: support_tickets support_tickets_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: titles titles_achievement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.titles
    ADD CONSTRAINT titles_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(id) ON DELETE SET NULL;


--
-- Name: type_base_attack_types type_base_attack_types_attack_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.type_base_attack_types
    ADD CONSTRAINT type_base_attack_types_attack_type_id_fkey FOREIGN KEY (attack_type_id) REFERENCES public.attack_types(id) ON DELETE CASCADE;


--
-- Name: type_base_attack_types type_base_attack_types_type_base_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.type_base_attack_types
    ADD CONSTRAINT type_base_attack_types_type_base_id_fkey FOREIGN KEY (type_base_id) REFERENCES public.item_type_bases(id) ON DELETE CASCADE;


--
-- Name: wave_preset_assignments wave_preset_assignments_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wave_preset_assignments
    ADD CONSTRAINT wave_preset_assignments_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;


--
-- Name: wave_preset_assignments wave_preset_assignments_chapter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wave_preset_assignments
    ADD CONSTRAINT wave_preset_assignments_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON DELETE CASCADE;


--
-- Name: wave_preset_assignments wave_preset_assignments_wave_preset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wave_preset_assignments
    ADD CONSTRAINT wave_preset_assignments_wave_preset_id_fkey FOREIGN KEY (wave_preset_id) REFERENCES public.wave_presets(id) ON DELETE CASCADE;

