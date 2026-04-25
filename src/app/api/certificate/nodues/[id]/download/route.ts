import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
// Dynamic Puppeteer imports for Vercel support
import * as Handlebars from "handlebars";
import * as fs from "fs";
import * as path from "path";
import * as QRCode from "qrcode";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            enrollmentNo: true,
            department: true,
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        { success: false, error: "Application not found" },
        { status: 404 }
      );
    }

    if (
      session.role === "STUDENT" &&
      application.studentId !== session.userId
    ) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    if (application.status !== "FULLY_APPROVED") {
      return NextResponse.json(
        { success: false, error: "Certificate not ready yet" },
        { status: 400 }
      );
    }

    // Read Handlebars Template
    const templatePath = path.join(process.cwd(), "noDuesCertificate.hbs");
    const templateSource = fs.readFileSync(templatePath, "utf-8");
    const template = Handlebars.compile(templateSource);

    // Prepare data
    const logoPath = path.join(process.cwd(), "public", "assets", "image1.jpeg");
    let logoBase64 = "";
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      logoBase64 = `data:image/jpeg;base64,${logoBuffer.toString("base64")}`;
    }

    // QR Code data URI
    let qrCodeDataURI = "";
    try {
        // Find the host dynamically from the request headers
        const host = request.headers.get("host") || "localhost:3000";
        const protocol = host.includes("localhost") ? "http" : "https";
        const verifyUrl = `${protocol}://${host}/certificate/verify/${application.id}`;
        qrCodeDataURI = await QRCode.toDataURL(verifyUrl, { margin: 1 });
    } catch (err) {
        console.error("QR Code Generation Error:", err);
    }

    const passOutYear = (application as any).passOutYear || new Date().getFullYear();
    const academicYear = `${passOutYear - 1}–${passOutYear}`;

    const data = {
      logoBase64,
      studentName: (application as any).fullName || application.student?.name || "",
      enrollmentId: application.student?.enrollmentNo || "",
      degree: (application as any).course || "B.Tech",
      department: application.student?.department || "",
      academicYear,
      qrCodeDataURI,
      applicationId: application.applicationNo,
    };

    const htmlContent = template(data);

    // Generate PDF with Puppeteer
    let browser;
    if (process.env.NODE_ENV === "development" || !process.env.VERCEL_ENV) {
      const puppeteer = require("puppeteer");
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    } else {
      const puppeteerCore = require("puppeteer-core");
      const chromium = require("@sparticuz/chromium");
      // Required for Vercel deployment
      chromium.setGraphicsMode = false;
      
      browser = await puppeteerCore.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });
    }
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0px", right: "0px", bottom: "0px", left: "0px" }
    });
    
    await browser.close();

    // Return as PDF
    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="NoDues_${application.student?.enrollmentNo || "Certificate"}.pdf"`,
      },
    });

  } catch (error) {
    console.error("PDF Generation Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate certificate PDF" },
      { status: 500 }
    );
  }
}
