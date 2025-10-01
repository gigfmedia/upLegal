import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Initialize Supabase client
const supabaseUrl = 'https://lgxsfmvyjctxehwslvyw.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function addGabrielaGomezProfile() {
  try {
    // First, create a user account for Gabriela
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'gabriela.gomez@example.com',
      password: 'strongpassword123',
      email_confirm: true,
      user_metadata: {
        name: 'Gabriela Gómez',
      },
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('User already exists, updating profile...');
        // If user exists, get the existing user
        const { data: existingUser } = await supabase.auth.admin.listUsers();
        const gabrielaUser = existingUser.users.find(u => u.email === 'gabriela.gomez@example.com');
        
        if (!gabrielaUser) {
          throw new Error('User exists but could not be found');
        }
        
        // Update the profile
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            first_name: 'Gabriela',
            last_name: 'Gómez',
            display_name: 'Gabriela Gómez',
            bio: 'Abogada especializada en derecho laboral y de familia con más de 10 años de experiencia. Comprometida con la defensa de los derechos de los trabajadores y las familias chilenas.',
            location: 'Santiago, Chile',
            role: 'lawyer',
            specialties: ['Derecho Laboral', 'Derecho de Familia'],
            hourly_rate_clp: 35000,
            languages: ['Español'],
            verified: true,
            available_for_hire: true,
            experience_years: 10,
            rating: 4.9,
            review_count: 142,
            availability: JSON.stringify({
              available_today: true,
              available_this_week: true,
              quick_response: true,
              emergency_consultations: true
            }),
            education: JSON.stringify([
              {
                degree: 'Licenciada en Derecho',
                university: 'Universidad de Chile',
                start_year: 2010,
                end_year: 2015
              }
            ]),
            verification_documents: {
              id_verification: {
                status: 'approved',
                verified_at: new Date().toISOString()
              },
              bar_verification: {
                status: 'approved',
                bar_number: '123456',
                state: 'Santiago',
                verified_at: new Date().toISOString()
              }
            },
            visibility_settings: {
              profile_visible: true,
              show_online_status: true,
              allow_direct_messages: true
            }
          })
          .eq('email', 'gabriela.gomez@example.com');

        if (updateError) throw updateError;
        console.log('Profile updated successfully');
        return;
      }
      throw authError;
    }

    const userId = authData.user.id;
    
    // Add profile data
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: uuidv4(),
          user_id: userId,
          email: 'gabriela.gomez@example.com',
          first_name: 'Gabriela',
          last_name: 'Gómez',
          display_name: 'Gabriela Gómez',
          avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1588&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
          bio: 'Abogada especializada en derecho laboral y de familia con más de 10 años de experiencia. Comprometida con la defensa de los derechos de los trabajadores y las familias chilenas.',
          location: 'Santiago, Chile',
          role: 'lawyer',
          specialties: ['Derecho Laboral', 'Derecho de Familia'],
          hourly_rate_clp: 35000,
          languages: ['Español'],
          verified: true,
          available_for_hire: true,
          experience_years: 10,
          rating: 4.9,
          review_count: 142,
          availability: JSON.stringify({
            available_today: true,
            available_this_week: true,
            quick_response: true,
            emergency_consultations: true
          }),
          education: JSON.stringify([
            {
              degree: 'Licenciada en Derecho',
              university: 'Universidad de Chile',
              start_year: 2010,
              end_year: 2015
            }
          ]),
          verification_documents: {
            id_verification: {
              status: 'approved',
              verified_at: new Date().toISOString()
            },
            bar_verification: {
              status: 'approved',
              bar_number: '123456',
              state: 'Santiago',
              verified_at: new Date().toISOString()
            }
          },
          visibility_settings: {
            profile_visible: true,
            show_online_status: true,
            allow_direct_messages: true
          }
        }
      ]);

    if (profileError) throw profileError;
    
    // Add some services
    const services = [
      {
        id: uuidv4(),
        lawyer_user_id: userId,
        title: 'Consulta Inicial',
        description: 'Primera consulta para evaluar tu caso y ofrecerte las mejores opciones legales.',
        price: 0,
        price_clp: 0,
        duration: 30,
        delivery_time: '1 día',
        features: [
          'Análisis de tu situación legal',
          'Orientación sobre los pasos a seguir',
          'Respuesta a tus preguntas',
          'Duración: 30 minutos'
        ],
        available: true
      },
      {
        id: uuidv4(),
        lawyer_user_id: userId,
        title: 'Asesoría Laboral',
        description: 'Asesoría especializada en temas laborales como despidos, finiquitos, despidos injustificados, etc.',
        price: 25000,
        price_clp: 25000,
        duration: 60,
        delivery_time: '2 días',
        features: [
          'Revisión de documentos laborales',
          'Asesoría personalizada',
          'Orientación sobre tus derechos',
          'Duración: 1 hora'
        ],
        available: true
      },
      {
        id: uuidv4(),
        lawyer_user_id: userId,
        title: 'Asesoría en Derecho de Familia',
        description: 'Asesoría en temas de familia como divorcios, pensión de alimentos, cuidado personal, etc.',
        price: 30000,
        price_clp: 30000,
        duration: 60,
        delivery_time: '2 días',
        features: [
          'Análisis de tu caso',
          'Orientación legal',
          'Estrategias legales',
          'Duración: 1 hora'
        ],
        available: true
      }
    ];

    const { error: servicesError } = await supabase
      .from('lawyer_services')
      .insert(services);

    if (servicesError) throw servicesError;

    console.log('Gabriela Gómez profile created successfully!');
  } catch (error) {
    console.error('Error creating Gabriela Gómez profile:', error);
  }
}

addGabrielaGomezProfile();
