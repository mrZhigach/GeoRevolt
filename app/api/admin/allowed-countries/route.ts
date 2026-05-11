import { NextRequest, NextResponse } from 'next/server';
import { getAllowedCountries, setAllowedCountries, isDbAvailable } from '@/lib/db';

export async function GET() {
  try {
    const available = await isDbAvailable();
    if (!available) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }
    const countries = await getAllowedCountries();
    return NextResponse.json({ countries });
  } catch (error) {
    console.error('GET /api/admin/allowed-countries error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const available = await isDbAvailable();
    if (!available) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }
    const body = await request.json();
    const { countries } = body;
    if (!Array.isArray(countries)) {
      return NextResponse.json({ error: 'countries must be an array of ISO-3166-1 alpha-2 codes' }, { status: 400 });
    }
    // List of valid ISO 3166-1 alpha-2 country codes for validation
    const VALID_ISO_CODES = new Set([
      'AD','AE','AF','AG','AI','AL','AM','AO','AQ','AR','AS','AT','AU','AW','AX','AZ',
      'BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS',
      'BT','BV','BW','BY','BZ','CA','CC','CD','CF','CG','CH','CI','CK','CL','CM','CN',
      'CO','CR','CU','CV','CW','CX','CY','CZ','DE','DJ','DK','DM','DO','DZ','EC','EE',
      'EG','EH','ER','ES','ET','FI','FJ','FK','FM','FO','FR','GA','GB','GD','GE','GF',
      'GG','GH','GI','GL','GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY','HK','HM',
      'HN','HR','HT','HU','ID','IE','IL','IM','IN','IO','IQ','IR','IS','IT','JE','JM',
      'JO','JP','KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ','LA','LB','LC',
      'LI','LK','LR','LS','LT','LU','LV','LY','MA','MC','MD','ME','MF','MG','MH','MK',
      'ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ','NA',
      'NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ','OM','PA','PE','PF','PG',
      'PH','PK','PL','PM','PN','PR','PS','PT','PW','PY','QA','RE','RO','RS','RU','RW',
      'SA','SB','SC','SD','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS',
      'ST','SV','SX','SY','SZ','TC','TD','TF','TG','TH','TJ','TK','TL','TM','TN','TO',
      'TR','TT','TV','TW','TZ','UA','UG','UM','US','UY','UZ','VA','VC','VE','VG','VI',
      'VN','VU','WF','WS','YE','YT','ZA','ZM','ZW',
    ]);
    for (const code of countries) {
      if (typeof code !== 'string' || !VALID_ISO_CODES.has(code.toUpperCase())) {
        return NextResponse.json({ error: `Invalid country code: ${code}` }, { status: 400 });
      }
    }
    await setAllowedCountries(countries);
    return NextResponse.json({ countries: await getAllowedCountries() });
  } catch (error) {
    console.error('POST /api/admin/allowed-countries error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
