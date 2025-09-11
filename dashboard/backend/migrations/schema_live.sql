--
-- PostgreSQL database dump
--

\restrict hpDqKaqR14PJMQZVlmcZHADhxB2YSIgzAYqv4zCQcgAMgtj6yL3PlibsDd6esI4

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: login_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.login_history (
    id integer NOT NULL,
    user_id integer,
    login_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_role character varying(50),
    user_email character varying(255)
);


ALTER TABLE public.login_history OWNER TO postgres;

--
-- Name: login_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.login_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.login_history_id_seq OWNER TO postgres;

--
-- Name: login_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.login_history_id_seq OWNED BY public.login_history.id;


--
-- Name: mqtt_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mqtt_messages (
    id integer NOT NULL,
    topic character varying(255) NOT NULL,
    message jsonb NOT NULL,
    received_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.mqtt_messages OWNER TO postgres;

--
-- Name: mqtt_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mqtt_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mqtt_messages_id_seq OWNER TO postgres;

--
-- Name: mqtt_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mqtt_messages_id_seq OWNED BY public.mqtt_messages.id;


--
-- Name: ppe_violations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ppe_violations (
    id integer NOT NULL,
    type character varying(50) NOT NULL,
    confidence double precision NOT NULL,
    "timestamp" timestamp without time zone NOT NULL,
    image_url text,
    work_order_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    contractor_id integer,
    work_order_number character varying(50)
);


ALTER TABLE public.ppe_violations OWNER TO postgres;

--
-- Name: ppe_violations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ppe_violations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ppe_violations_id_seq OWNER TO postgres;

--
-- Name: ppe_violations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ppe_violations_id_seq OWNED BY public.ppe_violations.id;


--
-- Name: work_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.work_orders (
    id integer NOT NULL,
    work_order_number character varying(50) NOT NULL,
    company_name character varying(255) NOT NULL,
    requested_by integer,
    status character varying(50) DEFAULT 'Pending'::character varying NOT NULL,
    submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    site_location jsonb,
    description text,
    rejection_reason text,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true,
    CONSTRAINT work_orders_status_check CHECK (((status)::text = ANY ((ARRAY['Pending'::character varying, 'Approved'::character varying, 'Rejected'::character varying])::text[])))
);


ALTER TABLE public.work_orders OWNER TO postgres;

--
-- Name: recent_violations; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.recent_violations AS
 SELECT v.id,
    v.type,
    v.confidence,
    v."timestamp",
    v.image_url,
    w.work_order_number,
    w.company_name
   FROM (public.ppe_violations v
     LEFT JOIN public.work_orders w ON ((v.work_order_id = w.id)))
  ORDER BY v."timestamp" DESC
 LIMIT 10;


ALTER VIEW public.recent_violations OWNER TO postgres;

--
-- Name: site_locations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.site_locations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    address text,
    work_order_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.site_locations OWNER TO postgres;

--
-- Name: site_locations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.site_locations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.site_locations_id_seq OWNER TO postgres;

--
-- Name: site_locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.site_locations_id_seq OWNED BY public.site_locations.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    company_name character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    work_id character varying(50),
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'contractor'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: work_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.work_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.work_orders_id_seq OWNER TO postgres;

--
-- Name: work_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.work_orders_id_seq OWNED BY public.work_orders.id;


--
-- Name: login_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login_history ALTER COLUMN id SET DEFAULT nextval('public.login_history_id_seq'::regclass);


--
-- Name: mqtt_messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mqtt_messages ALTER COLUMN id SET DEFAULT nextval('public.mqtt_messages_id_seq'::regclass);


--
-- Name: ppe_violations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ppe_violations ALTER COLUMN id SET DEFAULT nextval('public.ppe_violations_id_seq'::regclass);


--
-- Name: site_locations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.site_locations ALTER COLUMN id SET DEFAULT nextval('public.site_locations_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: work_orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_orders ALTER COLUMN id SET DEFAULT nextval('public.work_orders_id_seq'::regclass);


--
-- Name: login_history login_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login_history
    ADD CONSTRAINT login_history_pkey PRIMARY KEY (id);


--
-- Name: mqtt_messages mqtt_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mqtt_messages
    ADD CONSTRAINT mqtt_messages_pkey PRIMARY KEY (id);


--
-- Name: ppe_violations ppe_violations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ppe_violations
    ADD CONSTRAINT ppe_violations_pkey PRIMARY KEY (id);


--
-- Name: site_locations site_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.site_locations
    ADD CONSTRAINT site_locations_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_work_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_work_id_key UNIQUE (work_id);


--
-- Name: work_orders work_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_pkey PRIMARY KEY (id);


--
-- Name: work_orders work_orders_work_order_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_work_order_number_key UNIQUE (work_order_number);


--
-- Name: idx_contractor_work_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_contractor_work_id ON public.users USING btree (work_id) WHERE ((role)::text = 'contractor'::text);


--
-- Name: idx_ppe_violations_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ppe_violations_timestamp ON public.ppe_violations USING btree ("timestamp" DESC);


--
-- Name: login_history login_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login_history
    ADD CONSTRAINT login_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: ppe_violations ppe_violations_contractor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ppe_violations
    ADD CONSTRAINT ppe_violations_contractor_id_fkey FOREIGN KEY (contractor_id) REFERENCES public.users(id);


--
-- Name: ppe_violations ppe_violations_work_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ppe_violations
    ADD CONSTRAINT ppe_violations_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id);


--
-- Name: ppe_violations ppe_violations_work_order_number_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ppe_violations
    ADD CONSTRAINT ppe_violations_work_order_number_fkey FOREIGN KEY (work_order_number) REFERENCES public.work_orders(work_order_number);


--
-- Name: site_locations site_locations_work_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.site_locations
    ADD CONSTRAINT site_locations_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id);


--
-- Name: work_orders work_orders_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict hpDqKaqR14PJMQZVlmcZHADhxB2YSIgzAYqv4zCQcgAMgtj6yL3PlibsDd6esI4

