document.addEventListener('DOMContentLoaded', () => {

    const translations = {
        es: { "page": { "title": "Suite Empresarial - Tu Negocio, Simplificado" }, "header": { "modules": "Módulos", "plans": "Planes", "about": "Nosotros", "contact": "Contacto", "try_free": "Probar Gratis", "login": "Ingresar" }, "hero": { "title": "La Herramienta Definitiva para tu Negocio", "subtitle": "Centraliza, automatiza y optimiza cada área de tu empresa con nuestra plataforma todo-en-uno. Desde finanzas hasta ventas, todo bajo control.", "view_plans": "Ver Planes" }, "modules": { "tagline": "Todo en un solo lugar", "title": "Una Solución Integral para Cada Necesidad", "subtitle": "Explora los módulos diseñados para potenciar cada faceta de tu operación diaria.", "billing": { "title": "Facturación", "desc": "Crea, envía y gestiona facturas, notas crédito y más." }, "collections": { "title": "Cobranza", "desc": "Mejora tu flujo de caja con un seguimiento proactivo de tu cartera." }, "purchases": { "title": "Compras", "desc": "Administra proveedores y controla tus órdenes de compra." }, "treasury": { "title": "Tesorería", "desc": "Controla el flujo de caja, bancos y conciliaciones bancarias." }, "payroll": { "title": "Nómina", "desc": "Automatiza la liquidación y el pago de la nómina de tus empleados." }, "hr": { "title": "Talento Humano", "desc": "Gestiona el ciclo de vida de tus empleados y sus documentos." }, "crm": { "title": "CRM y Ventas", "desc": "Convierte prospectos en clientes y gestiona tus relaciones." }, "pos": { "title": "Punto de Venta (POS)", "desc": "Agiliza tus ventas en tienda con una interfaz rápida e integrada." }, "inventory": { "title": "Inventario", "desc": "Optimiza tu stock, gestiona almacenes y evita pérdidas." }, "ohs": { "title": "SG-SST", "desc": "Cumple con la normativa y gestiona la seguridad y salud laboral." }, "callcenter": { "title": "Call Center", "desc": "Administra llamadas, agentes y tareas de tu centro de atención." }, "reports": { "title": "Reportes Gerenciales", "desc": "Obtén una vista 360° de tu negocio con indicadores en tiempo real." } }, "plans": { "tagline": "Planes Flexibles", "title": "Elige el Plan Perfecto para Ti", "subtitle": "Comienza gratis o escala con nuestras soluciones profesionales. Sin contratos a largo plazo.", "starter": { "title": "Inicia", "price_suffix": "/para siempre", "description": "Ideal para freelancers o pequeñas empresas que empiezan a organizarse.", "feature1": "<i data-feather='check' class='h-5 w-5 text-green-500 mr-2'></i><strong>1 Usuario</strong>", "feature2": "<i data-feather='check' class='h-5 w-5 text-green-500 mr-2'></i>Acceso a todos los módulos", "feature3": "<i data-feather='check' class='h-5 w-5 text-green-500 mr-2'></i>Funcionalidad básica", "feature4": "<i data-feather='x' class='h-5 w-5 text-red-500 mr-2'></i>Datos almacenados <strong>localmente</strong>", "feature5": "<i data-feather='x' class='h-5 w-5 text-red-500 mr-2'></i>Sin almacenamiento en la nube", "cta": "Comenzar Gratis" }, "professional": { "badge": "Recomendado", "title": "Profesional", "price": "A tu Medida", "description": "Para empresas en crecimiento que necesitan potencia, seguridad y soporte.", "feature1": "<i data-feather='check' class='h-5 w-5 text-green-500 mr-2'></i><strong>Usuarios a convenir</strong>", "feature2": "<i data-feather='check' class='h-5 w-5 text-green-500 mr-2'></i>Todos los módulos con funciones avanzadas", "feature3": "<i data-feather='check' class='h-5 w-5 text-green-500 mr-2'></i><strong>Almacenamiento seguro en la nube</strong>", "feature4": "<i data-feather='check' class='h-5 w-5 text-green-500 mr-2'></i>Copias de seguridad automáticas", "feature5": "<i data-feather='check' class='h-5 w-5 text-green-500 mr-2'></i>Soporte prioritario por WhatsApp y email", "cta": "Contactar a Ventas" } }, "about": { "tagline": "Nuestra Misión", "title": "Empoderando a las Empresas Colombianas", "description": "En Suite Empresarial, nuestra misión es democratizar el acceso a herramientas de gestión de primer nivel. Creemos que la tecnología debe ser un aliado para el crecimiento, no una barrera. Por eso, hemos desarrollado una solución integral que simplifica la administración, permitiéndote enfocarte en lo que realmente importa: hacer crecer tu negocio." }, "contact": { "tagline": "Hablemos", "title": "Ponte en Contacto", "subtitle": "¿Tienes preguntas o necesitas una demo? Nuestro equipo está listo para ayudarte.", "whatsapp_cta": "<i data-feather='message-circle' class='mr-3'></i> Chatea con nosotros por WhatsApp", "form_intro": "O envíanos un mensaje a través de este formulario:", "form": { "name": "Nombre", "email": "Correo Electrónico", "message": "Mensaje", "submit": "Enviar Mensaje" } }, "footer": { "description": "Simplificando la gestión para empresas en Colombia.", "navigation": { "title": "Navegación", "modules": "Módulos", "plans": "Planes", "about": "Nosotros", "contact": "Contacto" }, "follow": { "title": "Síguenos" }, "copyright": "&copy; 2025 Suite Empresarial. Todos los derechos reservados." }, "support_chat": { "title": "Soporte y Ventas", "prompt": "Selecciona un departamento e ingresa tu nombre para iniciar.", "username_placeholder": "Tu nombre", "department_sales": "Ventas", "department_support": "Soporte", "connect_button": "Iniciar Chat", "message_placeholder": "Escribe un mensaje..." }, "ai_chat": { "title": "Asistente Virtual", "input_placeholder": "Pregúntale a la IA..." } },
        en: { "page": { "title": "Business Suite - Your Business, Simplified" }, "header": { "modules": "Modules", "plans": "Plans", "about": "About Us", "contact": "Contact", "try_free": "Try for Free", "login": "Login" }, "hero": { "title": "The Ultimate Tool for Your Business", "subtitle": "Centralize, automate, and optimize every area of your company with our all-in-one platform. From finance to sales, everything is under control.", "view_plans": "View Plans" }, "modules": { "tagline": "All in one place", "title": "A Comprehensive Solution for Every Need", "subtitle": "Explore the modules designed to enhance every aspect of your daily operations.", "billing": { "title": "Billing", "desc": "Create, send, and manage invoices, credit notes, and more." }, "collections": { "title": "Collections", "desc": "Improve your cash flow with proactive portfolio tracking." }, "purchases": { "title": "Purchases", "desc": "Manage suppliers and control your purchase orders." }, "treasury": { "title": "Treasury", "desc": "Control cash flow, banks, and bank reconciliations." }, "payroll": { "title": "Payroll", "desc": "Automate the settlement and payment of your employees' payroll." }, "hr": { "title": "Human Resources", "desc": "Manage your employees' lifecycle and their documents." }, "crm": { "title": "CRM & Sales", "desc": "Turn prospects into customers and manage your relationships." }, "pos": { "title": "Point of Sale (POS)", "desc": "Speed up your in-store sales with a fast and integrated interface." }, "inventory": { "title": "Inventory", "desc": "Optimize your stock, manage warehouses, and prevent losses." }, "ohs": { "title": "OHS Management", "desc": "Comply with regulations and manage occupational health and safety." }, "callcenter": { "title": "Call Center", "desc": "Manage calls, agents, and tasks for your customer service center." }, "reports": { "title": "Management Reports", "desc": "Get a 360° view of your business with real-time indicators." } }, "plans": { "tagline": "Flexible Plans", "title": "Choose the Perfect Plan for You", "subtitle": "Start for free or scale with our professional solutions. No long-term contracts.", "starter": { "title": "Starter", "price_suffix": "/forever", "description": "Ideal for freelancers or small businesses starting to get organized.", "feature1": "<i data-feather='check' class='h-5 w-5 text-green-500 mr-2'></i><strong>1 User</strong>", "feature2": "<i data-feather='check' class='h-5 w-5 text-green-500 mr-2'></i>Access to all modules", "feature3": "<i data-feather='check' class='h-5 w-5 text-green-500 mr-2'></i>Basic functionality", "feature4": "<i data-feather='x' class='h-5 w-5 text-red-500 mr-2'></i>Data stored <strong>locally</strong>", "feature5": "<i data-feather='x' class='h-5 w-5 text-red-500 mr-2'></i>No cloud storage", "cta": "Start for Free" }, "professional": { "badge": "Recommended", "title": "Professional", "price": "Customized", "description": "For growing companies that need power, security, and support.", "feature1": "<i data-feather='check' class='h-5 w-5 text-green-500 mr-2'></i><strong>Custom users</strong>", "feature2": "<i data-feather='check' class='h-5 w-5 text-green-500 mr-2'></i>All modules with advanced features", "feature3": "<i data-feather='check' class='h-5 w-5 text-green-500 mr-2'></i><strong>Secure cloud storage</strong>", "feature4": "<i data-feather='check' class='h-5 w-5 text-green-500 mr-2'></i>Automatic backups", "feature5": "<i data-feather='check' class='h-5 w-5 text-green-500 mr-2'></i>Priority support via WhatsApp and email", "cta": "Contact Sales" } }, "about": { "tagline": "Our Mission", "title": "Empowering Colombian Businesses", "description": "At Business Suite, our mission is to democratize access to top-tier management tools. We believe technology should be an ally for growth, not a barrier. That's why we've developed a comprehensive solution that simplifies administration, allowing you to focus on what really matters: growing your business." }, "contact": { "tagline": "Let's Talk", "title": "Get in Touch", "subtitle": "Have questions or need a demo? Our team is ready to help you.", "whatsapp_cta": "<i data-feather='message-circle' class='mr-3'></i> Chat with us on WhatsApp", "form_intro": "Or send us a message through this form:", "form": { "name": "Name", "email": "Email", "message": "Message", "submit": "Send Message" } }, "footer": { "description": "Simplifying management for businesses in Colombia.", "navigation": { "title": "Navigation", "modules": "Modules", "plans": "Plans", "about": "About Us", "contact": "Contact" }, "follow": { "title": "Follow Us" }, "copyright": "&copy; 2025 Business Suite. All rights reserved." }, "support_chat": { "title": "Support & Sales", "prompt": "Select a department and enter your name to begin.", "username_placeholder": "Your name", "department_sales": "Sales", "department_support": "Support", "connect_button": "Start Chat", "message_placeholder": "Type a message..." }, "ai_chat": { "title": "Virtual Assistant", "input_placeholder": "Ask the AI..." } },
        fr: { "page": { "title": "Suite d'Entreprise - Votre Entreprise, Simplifiée" }, "header": { "modules": "Modules", "plans": "Forfaits", "about": "À propos", "contact": "Contact", "try_free": "Essai Gratuit", "login": "Connexion" }, "hero": { "title": "L'Outil Ultime pour Votre Entreprise", "subtitle": "Centralisez, automatisez et optimisez chaque secteur de votre entreprise avec notre plateforme tout-en-un. Des finances aux ventes, tout est sous contrôle.", "view_plans": "Voir les Forfaits" }, "modules": { "tagline": "Tout en un seul endroit", "title": "Une Solution Complète pour Chaque Besoin", "subtitle": "Explorez les modules conçus pour dynamiser chaque facette de vos opérations quotidiennes.", "billing": { "title": "Facturation", "desc": "Créez, envoyez et gérez les factures, les notes de crédit et plus encore." }, "collections": { "title": "Recouvrement", "desc": "Améliorez votre flux de trésorerie avec un suivi proactif de votre portefeuille." }, "purchases": { "title": "Achats", "desc": "Gérez les fournisseurs et contrôlez vos bons de commande." }, "treasury": { "title": "Trésorerie", "desc": "Contrôlez les flux de trésorerie, les banques et les rapprochements bancaires." }, "payroll": { "title": "Paie", "desc": "Automatisez le calcul et le paiement de la paie de vos employés." }, "hr": { "title": "Ressources Humaines", "desc": "Gérez le cycle de vie de vos employés et leurs documents." }, "crm": { "title": "CRM & Ventes", "desc": "Transformez les prospects en clients et gérez vos relations." }, "pos": { "title": "Point de Vente (PDV)", "desc": "Accélérez vos ventes en magasin avec une interface rapide et intégrée." }, "inventory": { "title": "Inventaire", "desc": "Optimisez votre stock, gérez les entrepôts et évitez les pertes." }, "ohs": { "title": "SST", "desc": "Respectez la réglementation et gérez la santé et la sécurité au travail." }, "callcenter": { "title": "Centre d'Appels", "desc": "Gérez les appels, les agents et les tâches de votre centre de service." }, "reports": { "title": "Rapports de Gestion", "desc": "Obtenez une vue à 360° de votre entreprise avec des indicateurs en temps réel." } }, "plans": { "tagline": "Forfaits Flexibles", "title": "Choisissez le Forfait Parfait pour Vous", "subtitle": "Commencez gratuitement ou évoluez avec nos solutions professionnelles. Sans contrats à long terme.", "starter": { "title": "Débutant", "price_suffix": "/pour toujours", "description": "Idéal pour les freelances ou les petites entreprises qui commencent à s'organiser.", "feature1": "<i data-feather='check' class='h-5 w-5 text-green-500 mr-2'></i><strong>1 Utilisateur</strong>", "feature2": "<i data-feather='check' class='h-5 w-5 text-green-500 mr-2'></i>Accès à tous les modules", "feature3": "<i data-feather='check' class='h-5 w-5 text-green-500 mr-2'></i>Fonctionnalité de base", "feature4": "<i data-feather='x' class='h-5 w-5 text-red-500 mr-2'></i>Données stockées <strong>localement</strong>", "feature5": "<i data-feather='x' class='h-5 w-5 text-red-500 mr-2'></i>Pas de stockage cloud", "cta": "Commencer Gratuitement" }, "professional": { "badge": "Recommandé", "title": "Professionnel", "price": "Sur Mesure", "description": "Pour les entreprises en croissance qui ont besoin de puissance, de sécurité et de support.", "feature1": "<i data-feather='check' class='h-5 w-5 text-green-500 mr-2'></i><strong>Utilisateurs personnalisés</strong>", "feature2": "<i data-feather='check' class='h-5 w-5 text-green-500 mr-2'></i>Tous les modules avec fonctions avancées", "feature3": "<i data-feather='check' class='h-5 w-5 text-green-500 mr-2'></i><strong>Stockage cloud sécurisé</strong>", "feature4": "<i data-feather='check' class='h-5 w-5 text-green-500 mr-2'></i>Sauvegardes automatiques", "feature5": "<i data-feather='check' class='h-5 w-5 text-green-500 mr-2'></i>Support prioritaire par WhatsApp et email", "cta": "Contacter les Ventes" } }, "about": { "tagline": "Notre Mission", "title": "Autonomiser les Entreprises Colombiennes", "description": "Chez Suite d'Entreprise, notre mission est de démocratiser l'accès à des outils de gestion de premier ordre. Nous croyons que la technologie doit être un allié pour la croissance, et non une barrière. C'est pourquoi nous avons développé une solution complète qui simplifie l'administration, vous permettant de vous concentrer sur ce qui compte vraiment : la croissance de votre entreprise." }, "contact": { "tagline": "Parlons-en", "title": "Prenez Contact", "subtitle": "Vous avez des questions ou besoin d'une démo ? Notre équipe est prête à vous aider.", "whatsapp_cta": "<i data-feather='message-circle' class='mr-3'></i> Discutez avec nous sur WhatsApp", "form_intro": "Ou envoyez-nous un message via ce formulaire :", "form": { "name": "Nom", "email": "Courriel", "message": "Message", "submit": "Envoyer le Message" } }, "footer": { "description": "Simplifier la gestion pour les entreprises en Colombie.", "navigation": { "title": "Navigation", "modules": "Modules", "plans": "Forfaits", "about": "À propos", "contact": "Contact" }, "follow": { "title": "Suivez-nous" }, "copyright": "&copy; 2025 Suite d'Entreprise. Tous droits réservés." }, "support_chat": { "title": "Support & Ventes", "prompt": "Sélectionnez un département et entrez votre nom pour commencer.", "username_placeholder": "Votre nom", "department_sales": "Ventes", "department_support": "Support", "connect_button": "Démarrer le Chat", "message_placeholder": "Écrivez un message..." }, "ai_chat": { "title": "Assistant Virtuel", "input_placeholder": "Demandez à l'IA..." } },
        pt: { "page": { "title": "Suite Empresarial - Seu Negócio, Simplificado" }, "header": { "modules": "Módulos", "plans": "Planos", "about": "Sobre Nós", "contact": "Contato", "try_free": "Teste Grátis", "login": "Entrar" }, "hero": { "title": "A Ferramenta Definitiva para o Seu Negócio", "subtitle": "Centralize, automatize e otimize cada área da sua empresa com nossa plataforma tudo-em-um. De finanças a vendas, tudo sob controle.", "view_plans": "Ver Planos" }, "modules": { "tagline": "Tudo em um só lugar", "title": "Uma Solução Completa para Cada Necessidade", "subtitle": "Explore os módulos projetados para potencializar cada faceta da sua operação diária.", "billing": { "title": "Faturamento", "desc": "Crie, envie e gerencie faturas, notas de crédito e muito mais." }, "collections": { "title": "Cobrança", "desc": "Melhore seu fluxo de caixa com um acompanhamento proativo de sua carteira." }, "purchases": { "title": "Compras", "desc": "Gerencie fornecedores e controle seus pedidos de compra." }, "treasury": { "title": "Tesouraria", "desc": "Controle o fluxo de caixa, bancos e conciliações bancárias." }, "payroll": { "title": "Folha de Pagamento", "desc": "Automatize a liquidação e o pagamento da folha de seus funcionários." }, "hr": { "title": "Recursos Humanos", "desc": "Gerencie o ciclo de vida de seus funcionários e seus documentos." }, "crm": { "title": "CRM & Vendas", "desc": "Converta prospects em clientes e gerencie seus relacionamentos." }, "pos": { "title": "Ponto de Venda (PDV)", "desc": "Agilize suas vendas na loja com uma interface rápida e integrada." }, "inventory": { "title": "Inventário", "desc": "Otimize seu estoque, gerencie armazéns e evite perdas." }, "ohs": { "title": "SST", "desc": "Cumpra as normas e gerencie a segurança e saúde no trabalho." }, "callcenter": { "title": "Call Center", "desc": "Gerencie chamadas, agentes e tarefas do seu centro de atendimento." }, "reports": { "title": "Relatórios Gerenciais", "desc": "Obtenha uma visão 360° do seu negócio com indicadores em tempo real." } }, "plans": { "tagline": "Planos Flexíveis", "title": "Escolha o Plano Perfeito para Você", "subtitle": "Comece de graça ou escale com nossas soluções profissionais. Sem contratos de longo prazo.", "starter": { "title": "Iniciante", "price_suffix": "/para sempre", "description": "Ideal para freelancers ou pequenas empresas que estão começando a se organizar.", "feature1": "<i data-feather='check' class='h-5 w-5 text-green-500 mr-2'></i><strong>1 Usuário</strong>", "feature2": "<i data-feather='check' class='h-5 w-5 text-green-500 mr-2'></i>Acesso a todos os módulos", "feature3": "<i data-feather='check' class='h-5 w-5 text-green-500 mr-2'></i>Funcionalidade básica", "feature4": "<i data-feather='x' class='h-5 w-5 text-red-500 mr-2'></i>Dados armazenados <strong>localmente</strong>", "feature5": "<i data-feather='x' class='h-5 w-5 text-red-500 mr-2'></i>Sem armazenamento na nuvem", "cta": "Começar de Graça" }, "professional": { "badge": "Recomendado", "title": "Profissional", "price": "Sob Medida", "description": "Para empresas em crescimento que precisam de poder, segurança e suporte.", "feature1": "<i data-feather='check' class='h-5 w-5 text-green-500 mr-2'></i><strong>Usuários personalizados</strong>", "feature2": "<i data-feather='check' class='h-5 w-5 text-green-500 mr-2'></i>Todos os módulos com funções avançadas", "feature3": "<i data-feather='check' class='h-5 w-5 text-green-500 mr-2'></i><strong>Armazenamento seguro na nuvem</strong>", "feature4": "<i data-feather='check' class='h-5 w-5 text-green-500 mr-2'></i>Backups automáticos", "feature5": "<i data-feather='check' class='h-5 w-5 text-green-500 mr-2'></i>Suporte prioritário por WhatsApp e email", "cta": "Contatar Vendas" } }, "about": { "tagline": "Nossa Missão", "title": "Capacitando as Empresas Colombianas", "description": "Na Suite Empresarial, nossa missão é democratizar o acesso a ferramentas de gestão de primeira linha. Acreditamos que a tecnologia deve ser uma aliada para o crescimento, não uma barreira. Por isso, desenvolvemos uma solução completa que simplifica a administração, permitindo que você se concentre no que realmente importa: fazer seu negócio crescer." }, "contact": { "tagline": "Vamos Conversar", "title": "Entre em Contato", "subtitle": "Tem perguntas ou precisa de uma demonstração? Nossa equipe está pronta para ajudar.", "whatsapp_cta": "<i data-feather='message-circle' class='mr-3'></i> Converse conosco no WhatsApp", "form_intro": "Ou envie-nos uma mensagem através deste formulário:", "form": { "name": "Nome", "email": "E-mail", "message": "Mensagem", "submit": "Enviar Mensagem" } }, "footer": { "description": "Simplificando a gestão para empresas na Colômbia.", "navigation": { "title": "Navegação", "modules": "Módulos", "plans": "Planos", "about": "Sobre Nós", "contact": "Contato" }, "follow": { "title": "Siga-nos" }, "copyright": "&copy; 2025 Suite Empresarial. Todos os direitos reservados." }, "support_chat": { "title": "Suporte e Vendas", "prompt": "Selecione um departamento e digite seu nome para iniciar.", "username_placeholder": "Seu nome", "department_sales": "Vendas", "department_support": "Suporte", "connect_button": "Iniciar Bate-papo", "message_placeholder": "Digite uma mensagem..." }, "ai_chat": { "title": "Assistente Virtual", "input_placeholder": "Pergunte à IA..." } }
    };

    const languageSwitcher = document.getElementById('language-switcher');
    let currentLang = localStorage.getItem('lang') || 'es';
    let typedInstance = null; 

    // --- LÓGICA ORIGINAL: TRADUCCIONES ---
    const getTranslation = (key) => {
        return key.split('.').reduce((obj, i) => (obj ? obj[i] : null), translations[currentLang]);
    };

    const applyTranslations = () => {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (key !== 'hero.subtitle') {
                const translation = getTranslation(key);
                if (translation) element.innerHTML = translation;
            }
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            const translation = getTranslation(key);
            if (translation) element.placeholder = translation;
        });
        document.title = getTranslation('page.title');
        initTyped();
        feather.replace();
    };
    
    // --- LÓGICA ORIGINAL: ANIMACIÓN DE TEXTO ---
    const initTyped = () => {
        if (typedInstance) typedInstance.destroy();
        const subtitleString = getTranslation('hero.subtitle');
        if (subtitleString) {
            typedInstance = new Typed('#typed-subtitle', { strings: [subtitleString], typeSpeed: 40, loop: false });
        }
    };
    
    languageSwitcher.addEventListener('change', (e) => {
        currentLang = e.target.value;
        localStorage.setItem('lang', currentLang);
        applyTranslations();
    });

    // --- NUEVA LÓGICA: WIDGETS FLOTANTES ---
    const initializeFloatingWidgets = () => {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = window.location.host;

        // --- Lógica para el Chat de Soporte/Ventas ---
        const supportToggleButton = document.getElementById('support-toggle-button');
        const supportChatWindow = document.getElementById('support-chat-window');
        const supportLoginView = document.getElementById('support-login-view');
        const supportMainView = document.getElementById('support-main-view');
        const supportLoginForm = document.getElementById('support-login-form');
        const supportUsernameInput = document.getElementById('support-username-input');
        const supportDepartmentSelect = document.getElementById('support-department-select');
        const supportMessageList = document.getElementById('support-message-list');
        const supportChatForm = document.getElementById('support-chat-form');
        const supportMessageInput = document.getElementById('support-message-input');
        const supportChatHeader = document.getElementById('support-chat-header');
        let supportSocket = null;

        if (supportToggleButton) {
            supportToggleButton.addEventListener('click', () => {
                supportChatWindow.classList.toggle('hidden');
                document.getElementById('ai-chat-window').classList.add('hidden');
            });

            supportLoginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const userName = supportUsernameInput.value.trim();
                const department = supportDepartmentSelect.value;
                if (userName && !supportSocket) {
                    connectToSupportSocket(userName, department);
                    supportLoginView.classList.add('hidden');
                    supportMainView.classList.remove('hidden');
                    supportChatHeader.textContent = `${getTranslation('support_chat.title')} - ${department}`;
                }
            });

            const addSupportMessageToUI = (msg) => {
                const item = document.createElement('div');
                item.className = 'mb-3';
                const messageContent = msg.text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                item.innerHTML = `<div><span class="font-bold text-sm">${msg.user.replace(/</g, "&lt;")}</span><span class="text-xs text-gray-500 ml-2">${new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div><div class="text-gray-800 dark:text-gray-200 text-sm bg-gray-100 dark:bg-gray-700 p-2 rounded-md mt-1">${messageContent}</div>`;
                supportMessageList.appendChild(item);
                supportMessageList.scrollTop = supportMessageList.scrollHeight;
            };

            const connectToSupportSocket = (userName, department) => {
                const wsUrl = `${wsProtocol}//${wsHost}/api/chat?user=${encodeURIComponent(userName)}&room=${encodeURIComponent(department)}`;
                supportSocket = new WebSocket(wsUrl);

                supportSocket.addEventListener('message', event => {
                    const data = JSON.parse(event.data);
                    if (data.type === 'history') {
                        supportMessageList.innerHTML = '';
                        data.messages.forEach(addSupportMessageToUI);
                    } else if (data.type === 'text') {
                        addSupportMessageToUI(data);
                    }
                });

                supportSocket.addEventListener('close', () => {
                    supportSocket = null;
                    supportLoginView.classList.remove('hidden');
                    supportMainView.classList.add('hidden');
                });
            };

            supportChatForm.addEventListener('submit', event => {
                event.preventDefault();
                const text = supportMessageInput.value.trim();
                if (text && supportSocket) {
                    supportSocket.send(JSON.stringify({ type: 'text', text: text }));
                    supportMessageInput.value = '';
                }
            });
        }

        // --- Lógica para el Asistente IA (CONECTADO A GEMINI) ---
        const aiToggleButton = document.getElementById('ai-toggle-button');
        const aiChatWindow = document.getElementById('ai-chat-window');
        const aiMessageList = document.getElementById('ai-message-list');
        const aiChatForm = document.getElementById('ai-chat-form');
        const aiMessageInput = document.getElementById('ai-message-input');
        let aiChatHistory = [];

        if (aiToggleButton) {
            aiToggleButton.addEventListener('click', () => {
                aiChatWindow.classList.toggle('hidden');
                document.getElementById('support-chat-window').classList.add('hidden');
            });

            const addAiMessageToUI = (text, sender, isStreaming = false) => {
                if (isStreaming) {
                    let lastMessage = aiMessageList.querySelector('.streaming');
                    if (!lastMessage) {
                        const messageDiv = document.createElement('div');
                        messageDiv.className = `ai-message ${sender} streaming`;
                        messageDiv.innerHTML = `<div class="ai-message-bubble"></div>`;
                        aiMessageList.appendChild(messageDiv);
                        lastMessage = messageDiv;
                    }
                    const bubble = lastMessage.querySelector('.ai-message-bubble');
                    bubble.innerHTML += text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                } else {
                    aiMessageList.querySelectorAll('.streaming').forEach(el => el.classList.remove('streaming'));
                    const messageDiv = document.createElement('div');
                    messageDiv.className = `ai-message ${sender}`;
                    messageDiv.innerHTML = `<div class="ai-message-bubble">${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`;
                    aiMessageList.appendChild(messageDiv);
                }
                aiMessageList.scrollTop = aiMessageList.scrollHeight;
            };

            aiChatForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const userMessage = aiMessageInput.value.trim();
                if (!userMessage) return;

                addAiMessageToUI(userMessage, 'user');
                aiChatHistory.push({ role: 'user', parts: [{ text: userMessage }] });
                aiMessageInput.value = '';
                
                try {
                    const response = await fetch('/ai-chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            history: aiChatHistory.slice(0, -1),
                            question: userMessage,
                        }),
                    });

                    if (!response.ok) {
                        throw new Error(`Error del servidor: ${response.statusText}`);
                    }

                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    let fullResponse = "";

                    while (true) {
                        const { value, done } = await reader.read();
                        if (done) break;
                        
                        const chunk = decoder.decode(value);
                        const parts = chunk.match(/"text":\s*"(.*?)"/g);
                        if (parts) {
                            const extractedText = parts.map(p => JSON.parse(`{${p}}`).text).join('');
                            fullResponse += extractedText;
                            addAiMessageToUI(extractedText.replace(/\n/g, '<br>'), 'assistant', true);
                        }
                    }
                    
                    aiChatHistory.push({ role: 'model', parts: [{ text: fullResponse }] });
                    aiMessageList.querySelectorAll('.streaming').forEach(el => el.classList.remove('streaming'));
                } catch (error) {
                    console.error('Error al contactar al asistente de IA:', error);
                    addAiMessageToUI('Lo siento, no puedo responder en este momento.', 'assistant');
                }
            });
        }
    };
    
    // --- INICIALIZACIÓN GENERAL ---
    languageSwitcher.value = currentLang;
    applyTranslations(); 
    initializeFloatingWidgets(); 

    AOS.init({
        duration: 800,
        easing: 'ease-in-out',
        once: true,
        offset: 100,
    });

    VanillaTilt.init(document.querySelectorAll(".interactive-card"), {
        max: 15,
        speed: 400,
        glare: true,
        "max-glare": 0.5
    });

    const themeToggle = document.getElementById('theme-toggle');
    const applyTheme = (theme) => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
    };

    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);

    themeToggle.addEventListener('click', () => {
        const newTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
        feather.replace();
    });
    
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.querySelector('header nav');
    const mobileMenuLinks = mobileMenu.querySelectorAll('a');

    mobileMenuButton.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });

    mobileMenuLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
        });
    });

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetElement = document.querySelector(this.getAttribute('href'));
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});